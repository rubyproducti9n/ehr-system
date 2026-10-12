"""
EHR Platform — GatorTron NER Engine
Lazy-loaded on first NER request.
Auto-unloads after GATORTRON_IDLE_UNLOAD_SECONDS of inactivity to free RAM.
Uses ONNX INT8 model via onnxruntime.
"""

import logging
import time
import threading
import re
from pathlib import Path
from typing import List, Dict, Any

from config import (
    GATORTRON_ONNX_PATH,
    GATORTRON_IDLE_UNLOAD_SECONDS,
    NER_MIN_CONFIDENCE,
    PROJECT_ROOT,
)

log = logging.getLogger("ehr-ner")

_model = None
_tokenizer = None
_load_time = None
_last_used = None
_lock = threading.Lock()
_unload_timer = None

# Clinical entity labels GatorTron recognizes
# Map raw BERT NER labels to clean clinical categories
ENTITY_LABEL_MAP = {
    "B-DRUG": "DRUG",
    "I-DRUG": "DRUG",
    "B-DISEASE": "DIAGNOSIS",
    "I-DISEASE": "DIAGNOSIS",
    "B-SYMPTOM": "SYMPTOM",
    "I-SYMPTOM": "SYMPTOM",
    "B-PROCEDURE": "PROCEDURE",
    "I-PROCEDURE": "PROCEDURE",
    "B-DOSAGE": "DOSAGE",
    "I-DOSAGE": "DOSAGE",
    "B-FREQUENCY": "FREQUENCY",
    "I-FREQUENCY": "FREQUENCY",
}

# Rule-based fallback clinical vocabulary for common entities
COMMON_CLINICAL_PATTERNS = [
    # Drugs
    (r"\b(metformin|amlodipine|atorvastatin|aspirin|paracetamol|ibuprofen|amoxicillin|pantoprazole|losartan|lisinopril|azithromycin|ciprofloxacin|cetirizine|omeprazole|insulin|glimepiride|telmisartan|hydroxychloroquine|prednisolone|salbutamol|meftal|meftal-spas|augmentin|dolo|pan-d)\b", "DRUG"),
    # Diagnoses
    (r"\b(type 2 diabetes|diabetes mellitus|hypertension|asthma|pneumonia|covid-19|tuberculosis|anemia|gerd|osteoarthritis|migraine|urinary tract infection|uti|bronchitis|dengue|malaria|typhoid)\b", "DIAGNOSIS"),
    # Symptoms
    (r"\b(fever|cough|headache|chest pain|shortness of breath|fatigue|nausea|vomiting|dizziness|abdominal pain|body ache|sore throat|joint pain|rash|swelling)\b", "SYMPTOM"),
    # Dosages
    (r"\b(\d+\s*(?:mg|mcg|g|ml|tablets?|capsules?|drops?|puffs?))\b", "DOSAGE"),
    # Frequencies
    (r"\b(once daily|twice daily|thrice daily|1-0-1|1-0-0|0-0-1|1-1-1|bd|tds|od|sos|hs|every \d+ hours?|daily|weekly|monthly)\b", "FREQUENCY"),
    # Procedures
    (r"\b(ecg|chest x-ray|ct scan|mri|blood test|cbc|endoscopy|ultrasound|biopsy|dialysis|angioplasty|appendectomy|nebulization)\b", "PROCEDURE"),
]


def get_onnx_path() -> Path:
    path = Path(GATORTRON_ONNX_PATH)
    if not path.is_absolute():
        path = PROJECT_ROOT / path.relative_to(".")
    return path


def _schedule_unload():
    global _unload_timer
    if _unload_timer is not None:
        _unload_timer.cancel()
    _unload_timer = threading.Timer(
        GATORTRON_IDLE_UNLOAD_SECONDS,
        _unload_model
    )
    _unload_timer.daemon = True
    _unload_timer.start()


def _unload_model():
    global _model, _tokenizer, _load_time, _last_used
    with _lock:
        if _model is not None:
            _model = None
            _tokenizer = None
            _load_time = None
            _last_used = None
            log.info("GatorTron unloaded after idle timeout — RAM freed")


def load_ner_model():
    global _model, _tokenizer, _load_time, _last_used

    with _lock:
        if _model is not None:
            _last_used = time.time()
            _schedule_unload()
            return _model, _tokenizer

        onnx_path = get_onnx_path()
        if not onnx_path.exists():
            raise FileNotFoundError(
                f"GatorTron ONNX model not found at: {onnx_path}\n"
                f"Run first: python backend/convert_gatortron_to_onnx.py"
            )

        log.info(f"Loading GatorTron ONNX from: {onnx_path}")
        start = time.time()

        from transformers import AutoTokenizer
        import onnxruntime as ort

        onnx_file = onnx_path / "model.onnx"
        if not onnx_file.exists():
            # Check for any .onnx file
            onnx_files = list(onnx_path.glob("*.onnx"))
            if onnx_files:
                onnx_file = onnx_files[0]
            else:
                raise FileNotFoundError(f"No .onnx file found in {onnx_path}")

        _tokenizer = AutoTokenizer.from_pretrained(str(onnx_path))
        _model = ort.InferenceSession(str(onnx_file), providers=["CPUExecutionProvider"])

        _load_time = time.time() - start
        _last_used = time.time()
        log.info(f"GatorTron loaded in {_load_time:.1f}s")
        _schedule_unload()

    return _model, _tokenizer


def run_ner(text: str) -> List[Dict[str, Any]]:
    """
    Run NER on input text.
    Returns list of entities with type, text, start, end, confidence.
    Entities below NER_MIN_CONFIDENCE are filtered out.
    """
    if not text or not text.strip():
        return []

    model, tokenizer = load_ner_model()

    # Truncate to 512 tokens max (BERT limit)
    inputs = tokenizer(
        text,
        return_tensors="np",
        truncation=True,
        max_length=512,
        return_offsets_mapping=True,
    )

    offset_mapping = inputs.pop("offset_mapping")
    import numpy as np

    input_ids = inputs["input_ids"].astype(np.int64)
    attention_mask = inputs["attention_mask"].astype(np.int64)

    outputs = model.run(None, {"input_ids": input_ids, "attention_mask": attention_mask})
    logits = outputs[0]  # shape: (batch_size, seq_len, num_labels)

    # Compute softmax probabilities
    exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    probabilities = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
    predictions = np.argmax(probabilities, axis=-1)[0]
    confidences = np.max(probabilities, axis=-1)[0]

    # Check if model has trained entity labels in config
    id2label = getattr(tokenizer, "id2label", None) or {}
    has_meaningful_labels = any(lbl != "LABEL_0" and lbl != "LABEL_1" for lbl in id2label.values())

    tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
    offsets = offset_mapping[0].tolist()

    entities = []
    current_entity = None

    if has_meaningful_labels:
        for idx, (token, pred_id, conf, offset) in enumerate(zip(
            tokens,
            predictions.tolist(),
            confidences.tolist(),
            offsets,
        )):
            if token in ("[CLS]", "[SEP]", "[PAD]"):
                continue

            label = id2label.get(pred_id, "O")
            clean_label = ENTITY_LABEL_MAP.get(label, None)
            start_char, end_char = offset

            if clean_label and conf >= NER_MIN_CONFIDENCE:
                if label.startswith("B-") or current_entity is None:
                    if current_entity:
                        entities.append(current_entity)
                    current_entity = {
                        "type": clean_label,
                        "text": text[start_char:end_char],
                        "start": start_char,
                        "end": end_char,
                        "confidence": round(conf, 3),
                    }
                elif label.startswith("I-") and current_entity:
                    current_entity["text"] = text[current_entity["start"]:end_char]
                    current_entity["end"] = end_char
                    current_entity["confidence"] = round(
                        min(current_entity["confidence"], conf), 3
                    )
            else:
                if current_entity:
                    entities.append(current_entity)
                    current_entity = None

        if current_entity:
            entities.append(current_entity)

    # If base model has no fine-tuned classifier labels or found 0 entities, run pattern recognition
    if not entities:
        for pattern, ent_type in COMMON_CLINICAL_PATTERNS:
            for match in re.finditer(pattern, text, flags=re.IGNORECASE):
                entities.append({
                    "type": ent_type,
                    "text": text[match.start():match.end()],
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.95,
                })

    # Deduplicate overlapping entities — keep highest confidence
    deduped = []
    for entity in entities:
        overlap = False
        for existing in deduped:
            if not (entity["end"] <= existing["start"] or entity["start"] >= existing["end"]):
                overlap = True
                if entity["confidence"] > existing["confidence"]:
                    deduped.remove(existing)
                    deduped.append(entity)
                break
        if not overlap:
            deduped.append(entity)

    log.debug(f"NER found {len(deduped)} entities in {len(text)} chars")
    return sorted(deduped, key=lambda x: x["start"])


def tag_text_with_entities(text: str) -> Dict[str, Any]:
    """
    Runs NER and returns both the raw entity list and
    an annotated version of the text with entity markers.
    Used for display in transcript and OCR post-processing.
    """
    entities = run_ner(text)

    # Build annotated text — insert [ENTITY_TYPE] tags
    annotated = text
    offset = 0
    for entity in entities:
        tag = f"[{entity['type']}]"
        insert_pos = entity["end"] + offset
        annotated = annotated[:insert_pos] + tag + annotated[insert_pos:]
        offset += len(tag)

    # Group entities by type for summary
    by_type: Dict[str, List[str]] = {}
    for entity in entities:
        t = entity["type"]
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(entity["text"])

    return {
        "original_text": text,
        "annotated_text": annotated,
        "entities": entities,
        "summary": by_type,
    }


def is_model_loaded() -> bool:
    return _model is not None


def get_model_info() -> dict:
    idle_remaining = None
    if _last_used is not None:
        elapsed = time.time() - _last_used
        idle_remaining = max(0, GATORTRON_IDLE_UNLOAD_SECONDS - elapsed)

    return {
        "model": "UFNLP/gatortron-base-2k",
        "runtime": "onnxruntime-int8",
        "loaded": is_model_loaded(),
        "load_time_seconds": round(_load_time, 1) if _load_time else None,
        "idle_unload_in_seconds": round(idle_remaining) if idle_remaining else None,
        "onnx_path": str(get_onnx_path()),
    }
