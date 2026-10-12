"""
EHR Platform — Gemma 2 Embedding Engine
Lazy-loaded on first search request — stays resident after.
Uses safetensors format from model/gemma-2-embedding/
"""

import logging
import time
from pathlib import Path
from typing import List

from config import EMBEDDING_MODEL_PATH, PROJECT_ROOT

log = logging.getLogger("ehr-embedding")

_model = None
_load_time = None


def get_model_path() -> Path:
    path = Path(EMBEDDING_MODEL_PATH)
    if not path.is_absolute():
        path = PROJECT_ROOT / path.relative_to(".")
    return path


def load_embedding_model():
    global _model, _load_time
    if _model is not None:
        return _model

    model_path = get_model_path()
    if not model_path.exists():
        raise FileNotFoundError(
            f"Gemma 2 embedding model not found at: {model_path}\n"
            f"Ensure safetensors files are at: {model_path.resolve()}"
        )

    log.info(f"Loading Gemma 2 embedding model from: {model_path}")
    start = time.time()

    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer(
        str(model_path),
        device="cpu",
        trust_remote_code=True,
    )
    _load_time = time.time() - start
    log.info(f"Gemma 2 embedding loaded in {_load_time:.1f}s")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = load_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    return embed_texts([query])[0]


def is_model_loaded() -> bool:
    return _model is not None


def get_model_info() -> dict:
    return {
        "model": "gemma-2-embedding",
        "loaded": is_model_loaded(),
        "load_time_seconds": round(_load_time, 1) if _load_time else None,
        "model_path": str(get_model_path()),
    }
