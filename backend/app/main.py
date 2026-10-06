import io, base64, asyncio
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from rembg import remove, new_session
from transformers import pipeline

# Optional: paste a Hugging Face cat-breed model id here, e.g. "someuser/cat-breed-model"
BREED_MODEL = "ferdifdi/cat-breed-60-classes"

CAT_WORDS = ("tabby", "tiger cat", "persian cat", "siamese cat", "egyptian cat")

print("Loading models (first run downloads them)...")
gate = pipeline("image-classification", model="microsoft/resnet-50")
breed = pipeline("image-classification", model=BREED_MODEL) if BREED_MODEL else None
fast_session = new_session("u2netp")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


def is_cat_label(label: str) -> bool:
    return any(w in label.lower() for w in CAT_WORDS)


def classify(img: Image.Image) -> dict:
    results = gate(img, top_k=5)
    cat_results = [r for r in results if is_cat_label(r["label"])]
    cat_score = sum(r["score"] for r in cat_results)

    if not cat_results or (not is_cat_label(results[0]["label"]) and cat_score < 0.3):
        return {"breed": "Not A", "confidence": round((1 - cat_score) * 100, 1)}

    if breed:
        top = breed(img, top_k=1)[0]
        name = top["label"].replace("_", " ").replace("-", " ").title()
        return {"breed": name, "confidence": round(top["score"] * 100, 1)}

    best = max(cat_results, key=lambda r: r["score"])
    name = best["label"].split(",")[0].title()
    return {"breed": name, "confidence": round(best["score"] * 100, 1)}


def make_sticker(img: Image.Image) -> str:
    out = remove(img, session=fast_session)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@app.post("/api/identify")
async def identify_cat(file: UploadFile = File(...)):
    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
        img.thumbnail((500, 500))

        info, sticker = await asyncio.gather(
            asyncio.to_thread(classify, img),
            asyncio.to_thread(make_sticker, img),
        )

        return {
            "success": True,
            "breed": info["breed"],
            "confidence": info["confidence"],
            "funFacts": [],
            "stickerBase64": sticker,
        }
    except Exception as e:
        print("Error:", e)
        return JSONResponse(status_code=500,
                            content={"success": False, "error": str(e)})