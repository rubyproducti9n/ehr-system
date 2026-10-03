import json
import re
from typing import Any


def extract_json_from_response(raw: str) -> str:
    """
    Strips markdown fences and leading/trailing noise from LLM output.
    Models sometimes wrap JSON in ```json ... ``` despite being told not to.
    """
    # Remove markdown code fences
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)

    # Find the first { and last } — extract only the JSON object
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in model response")

    return raw[start : end + 1]


def parse_and_validate(raw_response: str) -> dict[str, Any]:
    """
    Parses LLM response into a validated Python dict.
    Returns the parsed dict or raises ValueError with a clear message.
    """
    cleaned = extract_json_from_response(raw_response)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from model: {e}\nRaw cleaned output:\n{cleaned}")

    if not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object, got {type(parsed).__name__}")

    return parsed


def null_undefined_fields(data: Any, path: str = "") -> Any:
    """
    Recursively walks the result dict.
    Replaces any string value of 'undefined', 'N/A', 'n/a', 'unknown',
    or empty string with None — normalizes LLM inconsistency.
    """
    NULLIFY = {"undefined", "n/a", "unknown", "not mentioned",
               "not available", "not specified", ""}

    if isinstance(data, dict):
        return {k: null_undefined_fields(v, f"{path}.{k}") for k, v in data.items()}
    elif isinstance(data, list):
        return [null_undefined_fields(item, f"{path}[{i}]") for i, item in enumerate(data)]
    elif isinstance(data, str) and data.strip().lower() in NULLIFY:
        return None
    return data
