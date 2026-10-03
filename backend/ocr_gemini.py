import os
import base64
import logging
import json
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.backend")

log = logging.getLogger("ehr-gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SUPPORTED_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
]
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

MEDICAL_EXTRACTION_PROMPT = """You are a clinical document field extractor specializing in Indian medical prescriptions and OPD case papers.
Extract all medical information from this prescription image and return ONLY a valid JSON object. No explanation, no markdown fences, no preamble.

Rules:
Extract only what is explicitly visible in the image.
For missing or unclear fields set value to null.
Never invent or guess information not visible.
For drug names: extract exactly as written, add generic name in parentheses if known.
Decode Indian dosage notation: 1-0-1 = twice daily morning and night, TDS = three times daily, BD = twice daily, OD = once daily, HS = at bedtime, SOS = as needed, BBF = before breakfast, BL = before lunch, BD = before dinner, s/c = subcutaneous, f/b = followed by, IU = international units.
For confidence: high = clearly visible and unambiguous, medium = partially legible or abbreviated, low = unclear or inferred.

Return this exact JSON structure:
{
  "document_type": null,
  "patient_name": {"value": null, "source_text": null, "confidence": "high"},
  "patient_age": {"value": null, "source_text": null, "confidence": "high"},
  "patient_gender": {"value": null, "source_text": null, "confidence": "high"},
  "date": {"value": null, "source_text": null, "confidence": "high"},
  "doctor_name": {"value": null, "source_text": null, "confidence": "high"},
  "doctor_qualification": {"value": null, "source_text": null, "confidence": "high"},
  "facility_name": {"value": null, "source_text": null, "confidence": "high"},
  "vitals": {
    "bp": {"value": null, "source_text": null, "confidence": "high"},
    "spo2": {"value": null, "source_text": null, "confidence": "high"},
    "temperature": {"value": null, "source_text": null, "confidence": "high"},
    "pulse_rate": {"value": null, "source_text": null, "confidence": "high"},
    "weight": {"value": null, "source_text": null, "confidence": "high"}
  },
  "diagnosis": {"value": null, "source_text": null, "confidence": "high"},
  "medications": [
    {
      "name": null,
      "generic_name": null,
      "dosage": null,
      "frequency": null,
      "frequency_decoded": null,
      "route": null,
      "duration": null,
      "source_text": null,
      "confidence": "high"
    }
  ],
  "investigations_advised": {"value": null, "source_text": null, "confidence": "high"},
  "advice": {"value": null, "source_text": null, "confidence": "high"},
  "follow_up": {"value": null, "source_text": null, "confidence": "high"}
}"""


def get_api_key() -> str:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        load_dotenv(Path(__file__).parent / ".env.backend", override=True)
        key = os.getenv("GEMINI_API_KEY", "")
    return key


def extract_json_from_response(text: str) -> dict:
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in Gemini response")
    return json.loads(text[start:end + 1])


def run_gemini_extraction(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    model: str = DEFAULT_GEMINI_MODEL,
) -> dict:
    import urllib.request
    import urllib.error

    if model not in SUPPORTED_GEMINI_MODELS:
        model = DEFAULT_GEMINI_MODEL

    api_key = get_api_key()
    if not api_key:
        raise ValueError("Gemini API key not configured. Set it in Dev Settings.")

    b64 = base64.b64encode(image_bytes).decode("utf-8")
    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": MEDICAL_EXTRACTION_PROMPT},
                {"inline_data": {"mime_type": mime_type, "data": b64}}
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"
        }
    }).encode("utf-8")

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    url = f"{endpoint}?key={api_key}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        log.error(f"Gemini API error {e.code}: {body}")
        try:
            error_data = json.loads(body)
            error_msg = error_data.get("error", {}).get("message", str(e))
        except Exception:
            error_msg = body or str(e)
        raise ValueError(f"Gemini API error: {error_msg}")

    candidates = result.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini returned no candidates")

    raw_text = candidates[0]["content"]["parts"][0]["text"]
    usage = result.get("usageMetadata", {})
    log.info(f"Gemini tokens ({model}) — input: {usage.get('promptTokenCount', 0)} output: {usage.get('candidatesTokenCount', 0)}")

    extracted = extract_json_from_response(raw_text)

    return {
        "success": True,
        "data": extracted,
        "document_type": extracted.get("document_type", "unknown"),
        "raw_response": raw_text,
        "token_usage": {
            "input": usage.get("promptTokenCount", 0),
            "output": usage.get("candidatesTokenCount", 0),
            "total": usage.get("totalTokenCount", 0),
        },
        "model_used": model,
        "error": None,
    }
