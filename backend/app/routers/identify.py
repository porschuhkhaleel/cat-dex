import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import IdentifyResponse
from app.services.breed_classifier import classify_breed

router = APIRouter()

FACTS_PATH = Path(__file__).resolve().parent.parent / "data" / "cat_facts.json"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

with open(FACTS_PATH, "r", encoding="utf-8") as f:
    CAT_FACTS = json.load(f)


@router.post("/identify", response_model=IdentifyResponse)
async def identify_cat(
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
):
    """
    Receives the composited photo from the camera screen (this matches the
    multipart/form-data body built in the frontend's `identifyCat()` in
    services/api.js: an `image` file plus optional `latitude`/`longitude`
    fields), runs it through the breed classifier, and returns the breed
    plus its fun facts.
    """
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image was empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large (max 10MB).")

    # latitude/longitude aren't used by the mock classifier, but they're
    # accepted here so this endpoint's signature already matches what a
    # location-aware model (or logging) would need later.
    breed, confidence = classify_breed(image_bytes)

    facts_entry = CAT_FACTS.get(breed)
    fun_facts = (
        facts_entry["funFacts"]
        if facts_entry
        else ["No fun facts on file for this breed yet -- but you still caught it!"]
    )

    return IdentifyResponse(breed=breed, confidence=confidence, fun_facts=fun_facts)
