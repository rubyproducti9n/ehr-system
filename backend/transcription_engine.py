"""
EHR Platform — omi-med-stt Transcription Engine
Wraps omi-med-stt runtime for chunk-based audio transcription.
Model is preloaded on import — stays resident.
"""

import logging
import time
import io
import wave
from pathlib import Path
import numpy as np

from config import OMI_MED_STT_MODEL_PATH, PROJECT_ROOT

log = logging.getLogger("ehr-transcription")

_pipeline = None
_model_load_time = None


def get_model_path() -> Path:
    path = Path(OMI_MED_STT_MODEL_PATH)
    if not path.is_absolute():
        path = PROJECT_ROOT / path.relative_to(".")
    return path


def load_model():
    """
    Load omi-med-stt pipeline.
    Called once on server startup — model stays resident.
    """
    global _pipeline, _model_load_time
    if _pipeline is not None:
        return _pipeline

    model_path = get_model_path()
    if not model_path.exists():
        raise FileNotFoundError(
            f"omi-med-stt model not found at: {model_path}\n"
            f"Ensure the model folder exists at: {model_path.resolve()}\n"
            f"Download from: https://huggingface.co/omi-health/omi-med-stt-v1"
        )

    log.info(f"Loading omi-med-stt from: {model_path}")
    start = time.time()

    try:
        from omi_med_stt import MedSTTPipeline
        _pipeline = MedSTTPipeline(
            model_path=str(model_path),
            runtime="cpp",        # Windows CPU — uses GGUF backend
        )
        _model_load_time = time.time() - start
        log.info(f"omi-med-stt loaded in {_model_load_time:.1f}s — transcription ready")
    except ImportError as e:
        log.error(f"omi-med-stt import failed: {e}")
        log.error("Run: pip install omi-med-stt")
        raise
    except Exception as e:
        log.error(f"Failed to load omi-med-stt: {e}")
        raise

    return _pipeline


def transcribe_chunk(pcm_bytes: bytes, sample_rate: int = 16000) -> dict:
    """
    Transcribe a single audio chunk.
    Input: raw 16-bit PCM bytes at 16kHz mono.
    Output: { text, confidence, duration_seconds }
    """
    pipeline = load_model()

    if len(pcm_bytes) < 512:
        return {"text": "", "confidence": 0.0, "duration_seconds": 0.0}

    # Convert PCM bytes to float32 numpy array
    samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    duration = len(samples) / sample_rate

    # Write to in-memory WAV — omi-med-stt accepts file path or BytesIO
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)       # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    wav_buffer.seek(0)

    result = pipeline.transcribe(wav_buffer)

    text = ""
    confidence = 0.0
    if isinstance(result, dict):
        text = result.get("text", "").strip()
        confidence = result.get("confidence", 1.0)
    elif isinstance(result, str):
        text = result.strip()
        confidence = 1.0

    log.debug(f"Transcribed {duration:.1f}s chunk: '{text}'")
    return {
        "text": text,
        "confidence": round(confidence, 3),
        "duration_seconds": round(duration, 2),
    }


def is_model_loaded() -> bool:
    return _pipeline is not None


def get_model_info() -> dict:
    return {
        "model": "omi-health/omi-med-stt-v1",
        "runtime": "cpp",
        "loaded": is_model_loaded(),
        "load_time_seconds": round(_model_load_time, 1) if _model_load_time else None,
        "model_path": str(get_model_path()),
    }
