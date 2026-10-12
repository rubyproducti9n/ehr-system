"""
EHR Platform — Semantic Search Engine
Embeds hospital data into per-hospital ChromaDB collection.
Performs semantic similarity search against user query.
Collection rebuilt on each search call — data always fresh.
"""

import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

import logging
import time
from typing import List, Dict, Any

from config import CHROMA_DB_PATH, SEARCH_TOP_K, SEARCH_MIN_SCORE
from embedding_engine import embed_texts, embed_query, load_embedding_model
from hospital_data_fetcher import fetch_hospital_data, format_for_embedding

log = logging.getLogger("ehr-search")

_chroma_client = None


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        _chroma_client = chromadb.Client()
        log.info("ChromaDB in-memory client initialized")
    return _chroma_client


def get_collection_name(hospital_id: str) -> str:
    # ChromaDB collection names must be alphanumeric + hyphens, max 63 chars
    safe_id = hospital_id.replace("_", "-")[:50]
    return f"hospital-{safe_id}"


def search_hospital(hospital_id: str, query: str) -> List[Dict]:
    """
    Main search function.
    Fetches fresh hospital data → embeds → searches → returns ranked results.
    """
    if not query or len(query.strip()) < 2:
        return []

    if not hospital_id:
        raise ValueError("hospital_id required for search")

    start = time.time()

    # Ensure embedding model is loaded
    load_embedding_model()

    # Fetch fresh hospital data from Firebase
    hospital_data = fetch_hospital_data(hospital_id)
    documents = format_for_embedding(hospital_data)

    if not documents:
        log.info("No hospital data to search")
        return []

    # Build in-memory collection — rebuild every call for freshness
    client = get_chroma_client()
    collection_name = get_collection_name(hospital_id)

    # Delete and recreate collection for fresh data
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Embed all documents
    texts = [doc["text"] for doc in documents]
    ids = [doc["id"] for doc in documents]
    metadatas = [doc["metadata"] for doc in documents]
    doc_types = [doc["type"] for doc in documents]

    embeddings = embed_texts(texts)

    collection.add(
        embeddings=embeddings,
        documents=texts,
        ids=ids,
        metadatas=[
            {**meta, "doc_type": dtype}
            for meta, dtype in zip(metadatas, doc_types)
        ],
    )

    # Embed query and search
    query_embedding = embed_query(query.strip())

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(SEARCH_TOP_K, len(documents)),
        include=["metadatas", "distances", "documents"],
    )

    elapsed = time.time() - start
    log.info(f"Search completed in {elapsed:.2f}s — query: '{query}'")

    # Format results
    output = []
    metadatas_list = results.get("metadatas", [[]])[0]
    distances_list = results.get("distances", [[]])[0]

    for metadata, distance in zip(metadatas_list, distances_list):
        # ChromaDB cosine distance — convert to similarity score
        score = 1.0 - distance
        if score < SEARCH_MIN_SCORE:
            continue
        output.append({
            "id": metadata.get("id", ""),
            "type": metadata.get("doc_type", ""),
            "label": metadata.get("label", ""),
            "sublabel": metadata.get("sublabel", ""),
            "href": metadata.get("href", "/"),
            "score": round(score, 3),
        })

    # Sort by score descending
    output.sort(key=lambda x: x["score"], reverse=True)

    # Cap: 5 patients, 3 providers, 3 facilities
    capped = []
    counts = {"patient": 0, "provider": 0, "facility": 0}
    limits = {"patient": 5, "provider": 3, "facility": 3}
    for item in output:
        t = item["type"]
        if counts.get(t, 0) < limits.get(t, 3):
            capped.append(item)
            counts[t] = counts.get(t, 0) + 1

    return capped
