import os
from pathlib import Path
from dotenv import load_dotenv

# Load from backend/.env.backend — resolve relative to this file
load_dotenv(Path(__file__).parent / ".env.backend")

# Resolve model paths relative to project root (one level above backend/)
PROJECT_ROOT = Path(__file__).parent.parent

# Candidate locations for primary and fallback GGUF files
PRIMARY_CANDIDATES = [
    PROJECT_ROOT / os.getenv("MODEL_PRIMARY", "./model/Qwen2.5-3B-Instruct-Q4_K_M.gguf"),
    PROJECT_ROOT / "model" / "Qwen2.5-3B-Instruct-Q4_K_M.gguf",
    PROJECT_ROOT / "model" / "QWEN2.5-3B-INSTRUCT_Q4_K_M" / "qwen2.5-3b-instruct.Q4_K_M.gguf",
]

FALLBACK_CANDIDATES = [
    PROJECT_ROOT / os.getenv("MODEL_FALLBACK", "./model/Llama-3.2-3B-Instruct-Q4_K_M.gguf"),
    PROJECT_ROOT / "model" / "Llama-3.2-3B-Instruct-Q4_K_M.gguf",
    PROJECT_ROOT / "model" / "Llama-3.2-3b-instruct-q4_k_m" / "llama-3.2-3b-instruct-q4_k_m.gguf",
]

def _resolve_candidate_path(candidates: list[Path]) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

MODEL_PATHS = {
    "primary": _resolve_candidate_path(PRIMARY_CANDIDATES),
    "fallback": _resolve_candidate_path(FALLBACK_CANDIDATES),
}

ACTIVE_MODEL_KEY = os.getenv("ACTIVE_MODEL", "primary")

INFERENCE_CONFIG = {
    "n_gpu_layers": int(os.getenv("N_GPU_LAYERS", -1)),
    "n_ctx":        int(os.getenv("N_CTX", 2048)),
    "n_threads":    int(os.getenv("N_THREADS", 4)),
    "verbose":      False,   # suppress llama.cpp token spam in console
}

GENERATION_CONFIG = {
    "max_tokens":  int(os.getenv("MAX_TOKENS", 1024)),
    "temperature": float(os.getenv("TEMPERATURE", 0.1)),
    "top_p":       float(os.getenv("TOP_P", 0.9)),
    "stop":        ["</s>", "<|endoftext|>", "<|im_end|>"],
}

SERVER_HOST = os.getenv("HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("PORT", 8765))
DEFAULT_STORAGE_ROOT = PROJECT_ROOT / "docs"
STORAGE_ROOT = os.getenv("STORAGE_ROOT") or str(DEFAULT_STORAGE_ROOT)


def get_active_model_path() -> Path:
    path = MODEL_PATHS[ACTIVE_MODEL_KEY]
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found: {path}\n"
            f"Ensure the GGUF file is placed at: {path.resolve()}"
        )
    return path


def get_model_info() -> dict:
    """Returns model metadata for the health check endpoint."""
    primary_exists = MODEL_PATHS["primary"].exists()
    fallback_exists = MODEL_PATHS["fallback"].exists()
    return {
        "active_model": ACTIVE_MODEL_KEY,
        "active_model_path": str(MODEL_PATHS[ACTIVE_MODEL_KEY]),
        "primary_model_available": primary_exists,
        "fallback_model_available": fallback_exists,
        "n_gpu_layers": INFERENCE_CONFIG["n_gpu_layers"],
        "n_ctx": INFERENCE_CONFIG["n_ctx"],
        "n_threads": INFERENCE_CONFIG["n_threads"],
    }
