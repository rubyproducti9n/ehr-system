"""
One-time conversion of GatorTron-base-2k (.bin) to ONNX INT8.
Run once: python backend/convert_gatortron_to_onnx.py

Input:  model/gatortron-base-2k/ (contains .bin weights)
Output: model/gatortron-onnx/ (ONNX model ready for onnxruntime)
"""

import sys
import io
import logging
from pathlib import Path

# Fix Windows console UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("convert")

PROJECT_ROOT = Path(__file__).parent.parent
INPUT_PATH = PROJECT_ROOT / "model" / "gatortron-base-2k"
OUTPUT_PATH = PROJECT_ROOT / "model" / "gatortron-onnx"


def convert():
    if not INPUT_PATH.exists():
        log.error(f"Input model not found: {INPUT_PATH}")
        log.error("Ensure GatorTron .bin files are at that path.")
        return

    if OUTPUT_PATH.exists() and any(OUTPUT_PATH.glob("*.onnx")):
        log.info(f"ONNX model already exists at: {OUTPUT_PATH} — skipping conversion")
        return

    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    log.info(f"Converting GatorTron from: {INPUT_PATH}")
    log.info(f"Output to: {OUTPUT_PATH}")
    log.info("This may take 2-5 minutes...")

    import torch
    from transformers import AutoModelForTokenClassification, AutoTokenizer

    log.info("Loading PyTorch model and tokenizer...")
    model = AutoModelForTokenClassification.from_pretrained(str(INPUT_PATH))
    tokenizer = AutoTokenizer.from_pretrained(str(INPUT_PATH))

    log.info("Saving tokenizer and config...")
    tokenizer.save_pretrained(str(OUTPUT_PATH))
    model.config.save_pretrained(str(OUTPUT_PATH))

    log.info("Exporting to ONNX...")
    dummy_input = tokenizer("Patient takes Metformin 500mg daily", return_tensors="pt")
    onnx_file = OUTPUT_PATH / "model.onnx"

    torch.onnx.export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"]),
        str(onnx_file),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "logits": {0: "batch_size", 1: "sequence_length"},
        },
        opset_version=18,
        do_constant_folding=True,
    )

    log.info("Quantizing to INT8...")
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        quantized_onnx_file = OUTPUT_PATH / "model_quantized.onnx"
        quantize_dynamic(
            model_input=str(onnx_file),
            model_output=str(quantized_onnx_file),
            weight_type=QuantType.QInt8,
        )
        # Replace unquantized with quantized model if successful
        if quantized_onnx_file.exists() and quantized_onnx_file.stat().st_size > 0:
            onnx_file.unlink()
            quantized_onnx_file.rename(onnx_file)
            log.info("INT8 dynamic quantization applied successfully.")
    except Exception as e:
        log.warning(f"Quantization skipped or failed, using FP32 ONNX model: {e}")

    log.info(f"Conversion complete. ONNX model at: {OUTPUT_PATH}")
    log.info("You can now run the server — GatorTron will load from the ONNX path.")


if __name__ == "__main__":
    convert()
