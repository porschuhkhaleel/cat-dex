import random
from typing import Tuple

# In production this would load a trained computer-vision model (a
# fine-tuned CNN, or a call out to a hosted vision model) and run
# inference on the incoming image bytes. For now it randomly picks a
# breed so the rest of the pipeline -- facts lookup, response shape,
# Firestore save -- can be built and tested end-to-end without a model
# in hand yet.
#
# Swap this out later for something like:
#   model = load_model("models/cat_breed_classifier.pt")
#   breed, confidence = model.predict(image_bytes)
# and keep the same (image_bytes) -> (breed, confidence) signature so
# nothing in the router has to change.

SUPPORTED_BREEDS = [
    "Tabby",
    "Siamese",
    "Maine Coon",
    "British Shorthair",
]


def classify_breed(image_bytes: bytes) -> Tuple[str, float]:
    """
    Mock breed classifier.

    Args:
        image_bytes: raw bytes of the captured (and possibly map-stamped)
            photo. Accepted here, even though unused, so the function's
            signature already matches what a real model call would need.

    Returns:
        (breed_name, confidence) tuple.
    """
    breed = random.choice(SUPPORTED_BREEDS)
    confidence = round(random.uniform(0.72, 0.98), 2)
    return breed, confidence
