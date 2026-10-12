"""
Downloads the Sherpa-ONNX streaming Zipformer INT8 model for transcription.
Run once: python backend/download_model.py
Model size: ~70MB
"""

import urllib.request
import tarfile
import os
from pathlib import Path

MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-2023-06-26.tar.bz2"
MODEL_DIR = Path(__file__).parent.parent / "model" / "sherpa"
ARCHIVE_PATH = MODEL_DIR / "zipformer.tar.bz2"
EXTRACTED_NAME = "sherpa-onnx-streaming-zipformer-en-2023-06-26"

def download_model():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    extracted = MODEL_DIR / EXTRACTED_NAME
    if extracted.exists():
        print(f"Model already exists at: {extracted}")
        return str(extracted)
    print(f"Downloading streaming Zipformer model (~70MB)...")
    print(f"Source: {MODEL_URL}")
    def progress(block_num, block_size, total_size):
        percent = min(block_num * block_size / total_size * 100, 100)
        print(f"\r  Progress: {percent:.1f}%", end="", flush=True)
    urllib.request.urlretrieve(MODEL_URL, ARCHIVE_PATH, reporthook=progress)
    print("\nExtracting...")
    with tarfile.open(ARCHIVE_PATH, "r:bz2") as tar:
        tar.extractall(MODEL_DIR)
    if ARCHIVE_PATH.exists():
        ARCHIVE_PATH.unlink()
    print(f"Model ready at: {extracted}")
    return str(extracted)

if __name__ == "__main__":
    path = download_model()
    print(f"\nModel path to use in transcription_server.py:\n{path}")
