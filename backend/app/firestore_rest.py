"""Minimal Firestore access over the REST API using only the Web API key.

No service-account key needed. Works with the project's current Firestore
rules. Supports get/create/update/list/query for the marketplace data
(users, jobs, applications, messages, tasks).
"""
import os
import uuid

import requests

_PROJECT = os.environ["FIREBASE_PROJECT_ID"]
_API_KEY = os.environ["FIREBASE_API_KEY"]
_BASE = f"https://firestore.googleapis.com/v1/projects/{_PROJECT}/databases/(default)/documents"


def new_id() -> str:
    return uuid.uuid4().hex


def _to_value(value):
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [_to_value(v) for v in value]}}
    if value is None:
        return {"nullValue": None}
    return {"stringValue": str(value)}


def _from_value(wrapper: dict):
    ((kind, value),) = wrapper.items()
    if kind == "integerValue":
        return int(value)
    if kind == "booleanValue":
        return bool(value)
    if kind == "doubleValue":
        return float(value)
    if kind == "nullValue":
        return None
    if kind == "arrayValue":
        return [_from_value(v) for v in value.get("values", [])]
    return value


def _to_fields(data: dict) -> dict:
    return {k: _to_value(v) for k, v in data.items()}


def _from_fields(fields: dict) -> dict:
    return {k: _from_value(v) for k, v in fields.items()}


def _doc_to_dict(doc: dict) -> dict:
    out = _from_fields(doc.get("fields", {}))
    out["id"] = doc["name"].rsplit("/", 1)[-1]
    return out


def get_document(collection: str, doc_id: str) -> dict | None:
    resp = requests.get(f"{_BASE}/{collection}/{doc_id}", params={"key": _API_KEY}, timeout=20)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return _doc_to_dict(resp.json())


def create_document(collection: str, doc_id: str, data: dict) -> dict:
    resp = requests.post(
        f"{_BASE}/{collection}",
        params={"key": _API_KEY, "documentId": doc_id},
        json={"fields": _to_fields(data)},
        timeout=20,
    )
    if resp.status_code == 409:
        raise FileExistsError(f"{collection}/{doc_id} already exists")
    resp.raise_for_status()
    return _doc_to_dict(resp.json())


def update_document(collection: str, doc_id: str, data: dict) -> dict:
    # Patch only the supplied fields (updateMask).
    params = [("key", _API_KEY)] + [("updateMask.fieldPaths", k) for k in data.keys()]
    resp = requests.patch(
        f"{_BASE}/{collection}/{doc_id}",
        params=params,
        json={"fields": _to_fields(data)},
        timeout=20,
    )
    resp.raise_for_status()
    return _doc_to_dict(resp.json())


def delete_document(collection: str, doc_id: str) -> None:
    resp = requests.delete(f"{_BASE}/{collection}/{doc_id}", params={"key": _API_KEY}, timeout=20)
    if resp.status_code != 404:
        resp.raise_for_status()


def list_collection(collection: str) -> list[dict]:
    docs: list[dict] = []
    page_token = None
    while True:
        params = {"key": _API_KEY, "pageSize": 300}
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(f"{_BASE}/{collection}", params=params, timeout=20)
        if resp.status_code == 404:
            return docs
        resp.raise_for_status()
        body = resp.json()
        docs.extend(_doc_to_dict(d) for d in body.get("documents", []))
        page_token = body.get("nextPageToken")
        if not page_token:
            return docs


def query(collection: str, field: str, value) -> list[dict]:
    """Structured query: collection where field == value."""
    resp = requests.post(
        f"{_BASE}:runQuery",
        params={"key": _API_KEY},
        json={
            "structuredQuery": {
                "from": [{"collectionId": collection}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": field},
                        "op": "EQUAL",
                        "value": _to_value(value),
                    }
                },
            }
        },
        timeout=20,
    )
    resp.raise_for_status()
    rows = resp.json()
    return [_doc_to_dict(r["document"]) for r in rows if "document" in r]
