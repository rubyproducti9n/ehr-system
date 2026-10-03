"""
EHR Platform — Local LLM Inference Server
Runs on 127.0.0.1:8765 (localhost only — never expose to network)
Start with: python backend/server.py
"""

import time
import logging
import base64
import signal
import sys
import os
import shutil
import uuid
import io
import ctypes
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Any, List

# ---------------------------------------------------------------------------
# Windows DLL directory bootstrap for llama_cpp + CUDA runtime
# ---------------------------------------------------------------------------
if sys.platform == "win32":
    _site_pkgs = Path(__file__).resolve().parent / "venv" / "Lib" / "site-packages"
    _dll_dirs = [
        _site_pkgs / "llama_cpp" / "lib",
        _site_pkgs / "nvidia" / "cuda_runtime" / "bin",
        _site_pkgs / "nvidia" / "cublas" / "bin",
        _site_pkgs / "nvidia" / "cuda_nvrtc" / "bin",
    ]
    for _d in _dll_dirs:
        if _d.exists():
            try:
                os.add_dll_directory(str(_d))
            except Exception:
                pass
            os.environ["PATH"] = f"{_d};" + os.environ.get("PATH", "")

    # Pre-load CUDA dependencies in order so Win32 dlopen resolves cublasLt & cublas cleanly
    _preload_dlls = [
        _site_pkgs / "nvidia" / "cuda_runtime" / "bin" / "cudart64_12.dll",
        _site_pkgs / "nvidia" / "cublas" / "bin" / "cublasLt64_12.dll",
        _site_pkgs / "nvidia" / "cublas" / "bin" / "cublas64_12.dll",
    ]
    for _dll in _preload_dlls:
        if _dll.exists():
            try:
                ctypes.windll.kernel32.LoadLibraryW(str(_dll))
            except Exception:
                pass

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from llama_cpp import Llama
from PIL import Image

from config import (
    get_active_model_path,
    get_model_info,
    INFERENCE_CONFIG,
    GENERATION_CONFIG,
    SERVER_HOST,
    SERVER_PORT,
    STORAGE_ROOT,
)
from prompts import SYSTEM_PROMPT, classify_prompt, PROMPT_ROUTER
from validator import parse_and_validate, null_undefined_fields
from ocr_engine import run_ocr
from ocr_gemini import run_gemini_extraction, get_api_key, DEFAULT_GEMINI_MODEL, SUPPORTED_GEMINI_MODELS

# ---------------------------------------------------------------------------
# Logging — minimal, no patient data in logs
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ehr-llm")


def handle_sigterm(signum, frame):
    log.info("Received shutdown signal — stopping server gracefully")
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_sigterm)

# ---------------------------------------------------------------------------
# Global model instance — loaded lazily on first extraction request
# ---------------------------------------------------------------------------
llm: Llama | None = None


def get_model() -> Llama:
    global llm
    if llm is None:
        model_path = get_active_model_path()
        log.info(f"Loading model on demand: {model_path.name}")
        log.info(f"GPU layers: {INFERENCE_CONFIG['n_gpu_layers']} | "
                 f"Context: {INFERENCE_CONFIG['n_ctx']} | "
                 f"Threads: {INFERENCE_CONFIG['n_threads']}")
        start = time.time()
        llm = Llama(
            model_path=str(model_path),
            n_gpu_layers=INFERENCE_CONFIG["n_gpu_layers"],
            n_ctx=INFERENCE_CONFIG["n_ctx"],
            n_threads=INFERENCE_CONFIG["n_threads"],
            verbose=INFERENCE_CONFIG["verbose"],
        )
        log.info(f"Model loaded in {time.time() - start:.1f}s")
    return llm


@asynccontextmanager
async def lifespan(app: FastAPI):
    import config
    docs_path = Path(config.STORAGE_ROOT)
    docs_path.mkdir(parents=True, exist_ok=True)
    log.info(f"Docs folder ready: {docs_path}")
    log.info("Server ready — model will load on first extraction request")
    yield
    global llm
    llm = None
    log.info("Server stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="EHR Local LLM Server",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow only the Next.js dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "x-user-email"],
)

# Static file serving for patient documents
if STORAGE_ROOT and Path(STORAGE_ROOT).exists():
    app.mount("/patient-docs", StaticFiles(directory=STORAGE_ROOT), name="patient-docs")
    log.info(f"Serving patient docs from: {STORAGE_ROOT}")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class ExtractRequest(BaseModel):
    text: str                    # OCR-extracted text from the document
    document_type: str = "auto"  # "auto" triggers classification first


class ExtractResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    success: bool
    document_type: str
    data: dict[str, Any] | None
    raw_response: str | None     # included for dev debugging only
    inference_time_ms: int
    model_used: str
    error: str | None = None


class OcrRequest(BaseModel):
    image_base64: str      # base64-encoded image bytes
    filename: str          # original filename for logging only — never stored


class OcrResponse(BaseModel):
    success: bool
    text: str
    lines: list[dict]
    avg_confidence: float
    low_confidence_warning: bool
    quality: dict | None = None               # ← new, optional
    preprocessing_applied: list[str] | None = None   # ← new, optional
    error: str | None = None


# ---------------------------------------------------------------------------
# Health check endpoint
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": llm is not None,
        "model": get_model_info(),
        "ocr_available": True,
    }


# ---------------------------------------------------------------------------
# Core extraction endpoint
# ---------------------------------------------------------------------------
@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest):
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short to extract from")

    model = get_model()

    # Cap input to avoid exceeding context window
    # Reserve 2048 tokens for prompt template + response
    MAX_INPUT_CHARS = (INFERENCE_CONFIG["n_ctx"] - 2048) * 3  # ~3 chars per token estimate
    input_text = req.text[:MAX_INPUT_CHARS]

    model_info = get_model_info()
    start = time.time()

    try:
        # Step 1: Classify if document_type is "auto"
        doc_type = req.document_type
        if doc_type == "auto":
            log.info("Classifying document type...")
            classify_response = model.create_chat_completion(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": classify_prompt(input_text)},
                ],
                max_tokens=64,           # classification needs very few tokens
                temperature=0.05,        # near-deterministic for classification
                top_p=GENERATION_CONFIG["top_p"],
                stop=GENERATION_CONFIG["stop"],
            )
            classify_raw = classify_response["choices"][0]["message"]["content"]
            classify_data = parse_and_validate(classify_raw)
            doc_type = classify_data.get("document_type", "other")
            log.info(f"Classified as: {doc_type} "
                     f"(confidence: {classify_data.get('confidence', 'unknown')})")

        # Step 2: Route to the correct extraction prompt
        prompt_fn = PROMPT_ROUTER.get(doc_type, PROMPT_ROUTER["other"])
        extraction_prompt = prompt_fn(input_text)

        # Step 3: Run extraction
        log.info(f"Running extraction for document type: {doc_type}")
        extract_response = model.create_chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": extraction_prompt},
            ],
            max_tokens=GENERATION_CONFIG["max_tokens"],
            temperature=GENERATION_CONFIG["temperature"],
            top_p=GENERATION_CONFIG["top_p"],
            stop=GENERATION_CONFIG["stop"],
        )
        raw_output = extract_response["choices"][0]["message"]["content"]

        # Step 4: Parse and normalize
        parsed = parse_and_validate(raw_output)
        normalized = null_undefined_fields(parsed)

        elapsed_ms = int((time.time() - start) * 1000)
        log.info(f"Extraction complete in {elapsed_ms}ms")

        return ExtractResponse(
            success=True,
            document_type=doc_type,
            data=normalized,
            raw_response=raw_output,  # remove in production promotion
            inference_time_ms=elapsed_ms,
            model_used=model_info["active_model_path"],
        )

    except ValueError as e:
        elapsed_ms = int((time.time() - start) * 1000)
        log.warning(f"Validation error: {e}")
        return ExtractResponse(
            success=False,
            document_type=doc_type,
            data=None,
            raw_response=None,
            inference_time_ms=elapsed_ms,
            model_used=model_info["active_model_path"],
            error=str(e),
        )

    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        error_msg = str(e)
        # Client disconnected mid-inference — log and continue, don't crash
        if "disconnect" in error_msg.lower() or "connection" in error_msg.lower():
            log.warning(f"Client disconnected during inference after {elapsed_ms}ms — server continuing")
            return ExtractResponse(
                success=False,
                document_type=doc_type,
                data=None,
                raw_response=None,
                inference_time_ms=elapsed_ms,
                model_used=model_info["active_model_path"],
                error="Client disconnected before inference completed",
            )
        log.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {error_msg}")


# ---------------------------------------------------------------------------
# OCR endpoint
# ---------------------------------------------------------------------------
@app.post("/ocr", response_model=OcrResponse)
def ocr_endpoint(req: OcrRequest):
    """
    Accepts a base64-encoded image, runs PaddleOCR, returns extracted text.
    Image bytes are processed in memory and immediately discarded — not saved to disk.
    """
    try:
        # Decode base64 — strip data URI prefix if present
        b64 = req.image_base64
        if "," in b64:
            b64 = b64.split(",", 1)[1]

        image_bytes = base64.b64decode(b64)
        log.info(f"OCR request received — {len(image_bytes) / 1024:.1f} KB image")

        result = run_ocr(image_bytes)

        return OcrResponse(
            success=True,
            text=result["text"],
            lines=result["lines"],
            avg_confidence=result["avg_confidence"],
            low_confidence_warning=result["low_confidence_warning"],
            quality=result.get("quality"),
            preprocessing_applied=result.get("preprocessing_applied"),
        )

    except ValueError as e:
        log.warning(f"OCR decode error: {e}")
        return OcrResponse(
            success=False,
            text="",
            lines=[],
            avg_confidence=0.0,
            low_confidence_warning=True,
            error=str(e),
        )

    except Exception as e:
        log.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


# ---------------------------------------------------------------------------
# Model switch endpoint — dev only, changes take effect on server restart
# ---------------------------------------------------------------------------
@app.post("/switch-model")
def switch_model(body: dict):
    """
    Writes ACTIVE_MODEL to .env.backend.
    Requires server restart to take effect.
    Usage: POST /switch-model {"model": "primary"} or {"model": "fallback"}
    """
    target = body.get("model")
    if target not in ("primary", "fallback"):
        raise HTTPException(status_code=400, detail="model must be 'primary' or 'fallback'")

    env_path = Path(__file__).parent / ".env.backend"
    lines = env_path.read_text().splitlines()
    updated = []
    for line in lines:
        if line.startswith("ACTIVE_MODEL="):
            updated.append(f"ACTIVE_MODEL={target}")
        else:
            updated.append(line)
    env_path.write_text("\n".join(updated))

    return {
        "message": f"Active model set to '{target}'. Restart the server to apply.",
        "restart_required": True,
    }


# ---------------------------------------------------------------------------
# System info endpoint — detects platform, default paths, and hardware specs
# ---------------------------------------------------------------------------
@app.get("/system-info")
def system_info():
    try:
        home = Path.home()
        docs = home / "Documents"
        project_docs = str(Path(__file__).parent.parent / "docs")
        username = os.environ.get("USERNAME") or os.environ.get("USER") or home.name

        # Hardware spec detection
        import psutil
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3), 1)
        avail_ram_gb = round(mem.available / (1024**3), 1)
        cpu_cores = psutil.cpu_count() or 1

        # CPU Name detection
        cpu_name = "Unknown CPU"
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            cpu_val, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            cpu_name = cpu_val.strip()
        except Exception:
            import platform
            cpu_name = platform.processor() or "Unknown CPU"

        # GPU & VRAM detection via nvidia-smi / torch
        gpu_detected = False
        gpu_name = None
        gpu_vram_gb = 0.0
        try:
            import subprocess
            out = subprocess.check_output(
                "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits",
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL
            ).strip()
            if out:
                first_gpu = out.splitlines()[0]
                parts = first_gpu.split(",")
                gpu_name = parts[0].strip()
                gpu_vram_mb = float(parts[1].strip())
                gpu_vram_gb = round(gpu_vram_mb / 1024, 1)
                gpu_detected = True
        except Exception:
            try:
                import torch
                if torch.cuda.is_available():
                    gpu_detected = True
                    gpu_name = torch.cuda.get_device_name(0)
                    props = torch.cuda.get_device_properties(0)
                    gpu_vram_gb = round(props.total_memory / (1024**3), 1)
            except Exception:
                pass

        model_info = get_model_info()
        has_local_model = bool(model_info.get("primary_model_available") or model_info.get("fallback_model_available"))

        # Requirements:
        # 1. CPU: Ryzen 7+ / Intel Core i7+ (or Ryzen 9, Threadripper, i9, Xeon, or >= 16 logical cores)
        name_lower = cpu_name.lower()
        is_cpu_supported = any(x in name_lower for x in ["ryzen 7", "ryzen 9", "threadripper", "i7", "i9", "xeon", "ultra 7", "ultra 9", "m1 pro", "m1 max", "m2 pro", "m2 max", "m3 pro", "m3 max", "m4 pro", "m4 max"]) or (cpu_cores >= 16)

        # 2. RAM: >= 16 GB (threshold >= 15.0)
        is_ram_supported = total_ram_gb >= 15.0

        # 3. VRAM: >= 8 GB (threshold >= 7.5)
        is_vram_supported = gpu_vram_gb >= 7.5

        is_hardware_supported = is_cpu_supported and is_ram_supported and is_vram_supported
        is_ready = is_hardware_supported and has_local_model

        missing_requirements = []
        if not is_cpu_supported:
            missing_requirements.append("Ryzen 7 / i7+ CPU")
        if not is_ram_supported:
            missing_requirements.append(f"16 GB RAM ({total_ram_gb} GB detected)")
        if not is_vram_supported:
            missing_requirements.append(f"8 GB VRAM ({gpu_vram_gb} GB detected)" if gpu_detected else "8 GB Dedicated GPU VRAM")

        if not is_hardware_supported:
            recommendation_reason = f"Device does not meet minimum specs: requires Ryzen 7 / i7+, 16 GB RAM, and 8 GB VRAM. (Missing: {', '.join(missing_requirements)})."
        elif not has_local_model:
            recommendation_reason = "Hardware compatible, but local model weights (.gguf) are not found in model directory."
        else:
            recommendation_reason = f"Hardware compatible ({cpu_name}, {total_ram_gb} GB RAM, {gpu_vram_gb} GB VRAM)."

        return {
            "default_documents_path": str(docs),
            "project_docs_path": project_docs,
            "username": username,
            "platform": "windows",
            "hardware": {
                "cpu_name": cpu_name,
                "cpu_cores": cpu_cores,
                "is_cpu_supported": is_cpu_supported,
                "total_ram_gb": total_ram_gb,
                "avail_ram_gb": avail_ram_gb,
                "is_ram_supported": is_ram_supported,
                "gpu_detected": gpu_detected,
                "gpu_name": gpu_name,
                "gpu_vram_gb": gpu_vram_gb,
                "is_vram_supported": is_vram_supported,
                "has_local_model": has_local_model,
                "is_supported": is_hardware_supported,
                "is_ready": is_ready,
                "missing_requirements": missing_requirements,
                "recommendation_reason": recommendation_reason,
            }
        }
    except Exception as e:
        log.error(f"system-info error: {e}")
        return {
            "default_documents_path": "C:\\Users\\User\\Documents",
            "project_docs_path": str(Path(__file__).parent.parent / "docs"),
            "username": "unknown",
            "platform": "windows",
            "hardware": {
                "cpu_name": "Unknown",
                "cpu_cores": 1,
                "is_cpu_supported": False,
                "total_ram_gb": 0,
                "avail_ram_gb": 0,
                "is_ram_supported": False,
                "gpu_detected": False,
                "gpu_name": None,
                "gpu_vram_gb": 0,
                "is_vram_supported": False,
                "has_local_model": False,
                "is_supported": False,
                "is_ready": False,
                "missing_requirements": ["System hardware unverified"],
                "recommendation_reason": "Could not inspect system hardware.",
            }
        }


# ---------------------------------------------------------------------------
# Image compression helper
# ---------------------------------------------------------------------------
def compress_image(content: bytes, ext: str) -> bytes:
    img = Image.open(io.BytesIO(content))
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    original_size = len(content)
    MAX_SIZE_KB = 800
    if original_size <= MAX_SIZE_KB * 1024:
        return content

    output = io.BytesIO()
    quality = 85
    while quality >= 40:
        output.seek(0)
        output.truncate()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        if output.tell() <= MAX_SIZE_KB * 1024:
            break
        quality -= 10

    MAX_DIMENSION = 2000
    w, h = img.size
    if w > MAX_DIMENSION or h > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)

    log.info(f"Compressed image: {round(original_size/1024)}KB → {round(output.tell()/1024)}KB")
    return output.getvalue()


# ---------------------------------------------------------------------------
# File upload endpoint
# ---------------------------------------------------------------------------
@app.post("/upload")
async def upload_files(
    patientId: str = Form(...),
    files: List[UploadFile] = File(...),
):
    from config import STORAGE_ROOT as CURRENT_STORAGE_ROOT
    storage_root = os.getenv("STORAGE_ROOT", CURRENT_STORAGE_ROOT).strip()
    if not storage_root:
        raise HTTPException(
            status_code=400,
            detail="Storage location not configured. Set it in Settings before uploading."
        )

    patient_folder = Path(storage_root) / patientId
    patient_folder.mkdir(parents=True, exist_ok=True)
    saved = []

    for file in files:
        ext = Path(file.filename or "file").suffix.lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.pdf']:
            continue
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique = uuid.uuid4().hex[:6]
        safe_name = f"{timestamp}_{unique}{ext}"
        dest = patient_folder / safe_name
        content = await file.read()
        if ext in ['.jpg', '.jpeg', '.png']:
            content = compress_image(content, ext)
        with open(dest, 'wb') as f:
            f.write(content)
        saved.append({
            "originalName": file.filename,
            "savedName": safe_name,
            "path": str(dest),
            "sizeKb": round(len(content) / 1024, 1),
            "type": "image" if ext != '.pdf' else "pdf",
        })

    if not saved:
        raise HTTPException(
            status_code=400,
            detail="No valid files uploaded. Supported: JPG, PNG, PDF."
        )

    return {"success": True, "files": saved, "patientId": patientId}


# ---------------------------------------------------------------------------
# Configure storage endpoint — syncs storage location from Firebase to backend
# ---------------------------------------------------------------------------
@app.post("/configure-storage")
def configure_storage(body: dict):
    path = body.get("path", "").strip().rstrip("\\").rstrip("/")
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")

    resolved = Path(path)
    try:
        resolved.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied creating '{path}'. Try a path inside your Documents or Desktop folder."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot create directory: {str(e)}")

    env_path = Path(__file__).parent / ".env.backend"
    lines = env_path.read_text().splitlines()
    updated = []
    found = False
    for line in lines:
        if line.startswith("STORAGE_ROOT="):
            updated.append(f"STORAGE_ROOT={path}")
            found = True
        else:
            updated.append(line)
    if not found:
        updated.append(f"STORAGE_ROOT={path}")
    env_path.write_text("\n".join(updated))

    os.environ["STORAGE_ROOT"] = path
    import config
    config.STORAGE_ROOT = path

    try:
        app.mount("/patient-docs", StaticFiles(directory=path), name="patient-docs")
    except Exception as e:
        log.warning(f"StaticFiles mount update: {e}")

    log.info(f"Storage configured: {path}")
    return {"success": True, "path": path}


# ---------------------------------------------------------------------------
# Gemini extraction models and endpoints
# ---------------------------------------------------------------------------
class GeminiExtractRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    filename: str = "document"
    model: str = DEFAULT_GEMINI_MODEL


class GeminiExtractResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    success: bool
    data: dict | None = None
    document_type: str | None = None
    raw_response: str | None = None
    token_usage: dict | None = None
    model_used: str | None = None
    error: str | None = None


@app.post("/gemini/extract", response_model=GeminiExtractResponse)
def gemini_extract(req: GeminiExtractRequest):
    try:
        if "," in req.image_base64:
            b64 = req.image_base64.split(",", 1)[1]
        else:
            b64 = req.image_base64
        image_bytes = base64.b64decode(b64)
        log.info(f"Gemini extraction request — {len(image_bytes) / 1024:.1f} KB image (model: {req.model})")
        result = run_gemini_extraction(image_bytes, req.mime_type, req.model)
        return GeminiExtractResponse(**result)
    except ValueError as e:
        return GeminiExtractResponse(success=False, error=str(e))
    except Exception as e:
        log.error(f"Gemini extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gemini/status")
def gemini_status():
    key = get_api_key()
    return {
        "configured": bool(key),
        "key_preview": f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "too short" if key else None,
        "model": DEFAULT_GEMINI_MODEL,
        "supported_models": SUPPORTED_GEMINI_MODELS,
    }


@app.post("/gemini/configure-key")
def gemini_configure_key(body: dict):
    key = body.get("api_key", "").strip()
    if len(key) < 20:
        raise HTTPException(status_code=400, detail="API key too short. Please check your key from Google AI Studio.")

    env_path = Path(__file__).parent / ".env.backend"
    lines = env_path.read_text().splitlines()
    found = False
    updated = []
    for line in lines:
        if line.startswith("GEMINI_API_KEY="):
            updated.append(f"GEMINI_API_KEY={key}")
            found = True
        else:
            updated.append(line)
    if not found:
        updated.append(f"GEMINI_API_KEY={key}")
    env_path.write_text("\n".join(updated))

    import ocr_gemini
    ocr_gemini.GEMINI_API_KEY = key
    os.environ["GEMINI_API_KEY"] = key
    log.info(f"Gemini API key configured: {key[:8]}...")
    return {"success": True, "message": "Gemini API key saved"}


@app.post("/gemini/clear-key")
def gemini_clear_key():
    env_path = Path(__file__).parent / ".env.backend"
    lines = env_path.read_text().splitlines()
    updated = [f"GEMINI_API_KEY=" if l.startswith("GEMINI_API_KEY=") else l for l in lines]
    env_path.write_text("\n".join(updated))
    os.environ["GEMINI_API_KEY"] = ""
    import ocr_gemini
    ocr_gemini.GEMINI_API_KEY = ""
    log.info("Gemini API key cleared")
    return {"success": True}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    from pathlib import Path

    log.info("=" * 50)
    log.info("EHR Local LLM Server — Dev Sandbox Only")
    log.info("Never expose this server outside localhost")
    log.info("=" * 50)

    uvicorn.run(
        "server:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=False,   # reload=True breaks the global llm instance
        workers=1,      # single worker — model is not thread-safe without a pool
    )
