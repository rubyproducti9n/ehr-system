"""
EHR Platform — Hospital Data Fetcher
Fetches and formats hospital data from Firebase for semantic search.
Strictly scoped to one hospitalId — never cross-hospital.
"""

import logging
import os
from pathlib import Path
from typing import List, Dict, Any

log = logging.getLogger("ehr-data-fetcher")

_firebase_app = None


def get_firebase_db():
    global _firebase_app
    try:
        import firebase_admin
        from firebase_admin import credentials, db as firebase_db

        if not firebase_admin._apps:
            service_account_b64 = os.getenv("FIREBASE_ADMIN_SERVICE_ACCOUNT", "")
            database_url = os.getenv("NEXT_PUBLIC_FIREBASE_DATABASE_URL", "")

            if not service_account_b64:
                raise ValueError(
                    "FIREBASE_ADMIN_SERVICE_ACCOUNT env var not set.\n"
                    "Add base64-encoded service account JSON to .env.backend"
                )

            import base64
            import json
            service_account = json.loads(
                base64.b64decode(service_account_b64).decode("utf-8")
            )
            cred = credentials.Certificate(service_account)
            _firebase_app = firebase_admin.initialize_app(cred, {
                "databaseURL": database_url
            })

        return firebase_db
    except ImportError:
        raise ImportError("firebase-admin not installed. Run: pip install firebase-admin")


def fetch_hospital_data(hospital_id: str) -> Dict[str, List[Dict]]:
    """
    Fetches all searchable data for a hospital from Firebase.
    Returns structured dict with patients, providers, facilities.
    Strictly scoped to hospital_id — raises ValueError if hospital_id is empty.
    """
    if not hospital_id or not hospital_id.strip():
        raise ValueError("hospital_id is required — cannot fetch cross-hospital data")

    db = get_firebase_db()
    log.info(f"Fetching hospital data for: {hospital_id}")

    result = {
        "patients": [],
        "providers": [],
        "facilities": [],
    }

    # Fetch patients
    try:
        patients_ref = db.reference(f"hospitals/{hospital_id}/patients")
        patients_data = patients_ref.get() or {}
        for pid, patient in patients_data.items():
            if not isinstance(patient, dict):
                continue
            result["patients"].append({
                "id": pid,
                "type": "patient",
                "name": patient.get("name", ""),
                "gender": patient.get("gender", ""),
                "status": patient.get("status", ""),
                "allergies": ", ".join(patient.get("allergies", [])) if isinstance(patient.get("allergies"), list) else str(patient.get("allergies", "")),
                "lastVisitDate": patient.get("lastVisitDate", ""),
            })
    except Exception as e:
        log.warning(f"Failed to fetch patients: {e}")

    # Fetch providers
    try:
        providers_ref = db.reference(f"hospitals/{hospital_id}/providers")
        providers_data = providers_ref.get() or {}
        for pvid, provider in providers_data.items():
            if not isinstance(provider, dict):
                continue
            result["providers"].append({
                "id": pvid,
                "type": "provider",
                "name": provider.get("name", ""),
                "specialty": provider.get("specialty", ""),
                "email": provider.get("email", ""),
                "phone": provider.get("phone", ""),
            })
    except Exception as e:
        log.warning(f"Failed to fetch providers: {e}")

    # Fetch facilities
    try:
        facilities_ref = db.reference(f"hospitals/{hospital_id}/facilities")
        facilities_data = facilities_ref.get() or {}
        for fid, facility in facilities_data.items():
            if not isinstance(facility, dict):
                continue
            result["facilities"].append({
                "id": fid,
                "type": "facility",
                "name": facility.get("name", ""),
                "address": facility.get("address", ""),
                "phone": facility.get("phone", ""),
            })
    except Exception as e:
        log.warning(f"Failed to fetch facilities: {e}")

    log.info(
        f"Fetched hospital data — "
        f"{len(result['patients'])} patients, "
        f"{len(result['providers'])} providers, "
        f"{len(result['facilities'])} facilities"
    )
    return result


def format_for_embedding(hospital_data: Dict[str, List[Dict]]) -> List[Dict]:
    """
    Converts hospital data into flat list of embeddable documents.
    Each document has: id, type, text (for embedding), metadata (for return to UI).
    """
    documents = []

    for patient in hospital_data["patients"]:
        text = (
            f"Patient: {patient['name']}. "
            f"Gender: {patient['gender']}. "
            f"Status: {patient['status']}. "
            f"Allergies: {patient['allergies'] or 'none'}. "
            f"Last visit: {patient['lastVisitDate'] or 'unknown'}."
        )
        documents.append({
            "id": f"patient_{patient['id']}",
            "type": "patient",
            "text": text,
            "metadata": {
                "id": patient["id"],
                "label": patient["name"],
                "sublabel": f"Patient · {patient['status'].capitalize() if patient.get('status') else 'Active'}",
                "href": f"/patients/{patient['id']}",
            }
        })

    for provider in hospital_data["providers"]:
        text = (
            f"Doctor: {provider['name']}. "
            f"Specialty: {provider['specialty']}. "
            f"Email: {provider['email']}."
        )
        documents.append({
            "id": f"provider_{provider['id']}",
            "type": "provider",
            "text": text,
            "metadata": {
                "id": provider["id"],
                "label": provider["name"],
                "sublabel": provider["specialty"],
                "href": "/providers",
            }
        })

    for facility in hospital_data["facilities"]:
        text = (
            f"Hospital: {facility['name']}. "
            f"Address: {facility['address']}. "
            f"Phone: {facility['phone']}."
        )
        documents.append({
            "id": f"facility_{facility['id']}",
            "type": "facility",
            "text": text,
            "metadata": {
                "id": facility["id"],
                "label": facility["name"],
                "sublabel": facility["address"],
                "href": "/hospitals",
            }
        })

    return documents
