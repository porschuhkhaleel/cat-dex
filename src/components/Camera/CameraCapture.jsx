import { useEffect, useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";
import { useAuth } from "../../contexts/AuthContext";
import { saveCatToCollection } from "../../utils/collectionStorage";

const MAX_CAPTURE_SIDE = 1024;
const MAX_STICKER_SIDE = 512;
const STICKER_BORDER = 12;

const LOADING_TEXTS = [
  "Locking in...",
  "Finding the cat...",
  "Making your sticker...",
  "Almost done...",
];

const RANDOM_CAT_NAMES = [
  // Must-haves
  "Mozi", "Sugar",

  // Best from your list
  "Beer", "ruba refa3i", "wifi router", "Bubba", "Butternut", "Butterscotch", "Cat",
  "Cheeto", "Chewy", "Cookie", "Cuddlebug", "Diva", "Dorito", "Dumpling",
  "Fifi", "Fritter", "Garfield", "Gizmo", "OME", "yazeed", "aws",
  "Kit-Kat", "67", "Mango", "ayham", "Mewie", "Mochi", "Nacho",
  "water bottle", "Ninja", "Nouget", "Pip", "pepsi", "Pixie", "Puddin", "Pudge",
  "Pumpkin", "Queenie", "Rufus", "snjoob", "Smudge", "Spaz", "Spooky",
  "Stitch", "Sushi", "Tater Tot", "the rock", "Toast", "Tofu", "Tuna",
  "android phone ", "Waffles", "Whisky", "c6 corvette",

  // Stupid names
  "Microwave", "Concrete", "Tax Fraud", "Forklift", "Toaster", "Garlic Bread",
  "Soup", "Drywall", "Speedbump", "Ceiling Fan", "Traffic Cone", "Wi-Fi",
  "Crouton", "Meatball", "Floorboard", "Cardboard", "Brick", "Lint",
  "Roomba", "Mayonnaise", "Spoon", "Paperclip", "Radiator", "Megatron",
  "Honda Civic", "Crunchwrap", "Beef", "Gravel", "Dishwasher", "Beanbag",
  "Stapler", "Doorstop", "Burrito", "Lawn Mower", "Rat", "Goblin",
  "Bingus", "Goober", "Grease Trap", "Parking Ticket", "Wet Wipe", "Laundromat",
];

function pickRandomName(current) {
  const pool = RANDOM_CAT_NAMES.filter((n) => n !== current);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function blobToResizedStickerDataUrl(blob) {
  const bitmap = await createImageBitmap(blob);

  // 1. Draw full cutout to clean up faint edge pixels and find bounding box
  const raw = document.createElement("canvas");
  raw.width = bitmap.width;
  raw.height = bitmap.height;
  const rawCtx = raw.getContext("2d");
  rawCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imgData = rawCtx.getImageData(0, 0, raw.width, raw.height);
  const data = imgData.data;

  let minX = raw.width;
  let minY = raw.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      const idx = (y * raw.width + x) * 4;
      if (data[idx + 3] < 160) {
        data[idx + 3] = 0;
      } else {
        data[idx + 3] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  rawCtx.putImageData(imgData, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = raw.width - 1;
    maxY = raw.height - 1;
  }

  // 2. Resize the cropped cat to leave room for the die-cut white border
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const innerMax = MAX_STICKER_SIDE - STICKER_BORDER * 2;
  const scale = Math.min(1, innerMax / Math.max(cropW, cropH));
  const drawW = Math.round(cropW * scale);
  const drawH = Math.round(cropH * scale);

  // 3. Create a solid white silhouette of the cat
  const silhouette = document.createElement("canvas");
  silhouette.width = drawW;
  silhouette.height = drawH;
  const silCtx = silhouette.getContext("2d");
  silCtx.drawImage(raw, minX, minY, cropW, cropH, 0, 0, drawW, drawH);
  silCtx.globalCompositeOperation = "source-in";
  silCtx.fillStyle = "#ffffff";
  silCtx.fillRect(0, 0, drawW, drawH);

  // 4. Stamp the white silhouette in a smooth circle, then draw the cat on top
  const out = document.createElement("canvas");
  out.width = drawW + STICKER_BORDER * 2;
  out.height = drawH + STICKER_BORDER * 2;
  const outCtx = out.getContext("2d");

  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const ox = Math.cos(angle) * STICKER_BORDER;
    const oy = Math.sin(angle) * STICKER_BORDER;
    outCtx.drawImage(silhouette, STICKER_BORDER + ox, STICKER_BORDER + oy);
  }
  outCtx.drawImage(
    raw,
    minX,
    minY,
    cropW,
    cropH,
    STICKER_BORDER,
    STICKER_BORDER,
    drawW,
    drawH
  );

  const webp = out.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : out.toDataURL("image/png");
}

export default function CameraCapture({ onSaved }) {
  const { currentUser } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [stickerBase64, setStickerBase64] = useState(null);
  const [catName, setCatName] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function getCameraStream() {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    async function start() {
      try {
        const stream = await getCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setCamError(
            err && err.name === "NotAllowedError"
              ? "Camera access was blocked. Allow camera permission in your browser settings and reload."
              : "Couldn't start your camera. Make sure one is available and you're on HTTPS or localhost."
          );
        }
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamError("Your browser doesn't support camera access.");
    } else {
      start();
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    setTextIndex(0);
    const id = setInterval(
      () => setTextIndex((i) => (i + 1) % LOADING_TEXTS.length),
      1500
    );
    return () => clearInterval(id);
  }, [loading]);

  function resumeVideo() {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || loading || !video.videoWidth) return;

    setLoading(true);
    setToast("");
    video.pause();

    try {
      const scale = Math.min(
        1,
        MAX_CAPTURE_SIDE / Math.max(video.videoWidth, video.videoHeight)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!photoBlob) throw new Error("Failed to capture photo.");

      const cutoutBlob = await removeBackground(photoBlob);
      const dataUrl = await blobToResizedStickerDataUrl(cutoutBlob);
      setStickerBase64(dataUrl);
    } catch (err) {
      console.error("Sticker error:", err);
      setToast("Couldn't cut out that photo. Try again!");
      resumeVideo();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!catName.trim()) {
      setToast("Give your cat a name first!");
      return;
    }
    setSaving(true);
    setToast("");
    try {
      await saveCatToCollection(currentUser.uid, {
        name: catName,
        stickerBase64,
      });
      setStickerBase64(null);
      setCatName("");
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Save error:", err);
      setToast("Couldn't save to your collection. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  if (camError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 p-8 text-center">
        <div>
          <p className="text-5xl mb-4">📷</p>
          <p className="text-white text-lg font-semibold max-w-xs">{camError}</p>
        </div>
      </div>
    );
  }

  const corner = "absolute w-12 h-12 border-white";

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!stickerBase64 && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-[72vmin] h-[72vmin] max-w-md max-h-md">
              <span className={`${corner} top-0 left-0 border-t-3 border-l-3 rounded-tl-3xl`} />
              <span className={`${corner} top-0 right-0 border-t-3 border-r-3 rounded-tr-3xl`} />
              <span className={`${corner} bottom-0 left-0 border-b-3 border-l-3 rounded-bl-3xl`} />
              <span className={`${corner} bottom-0 right-0 border-b-3 border-r-3 rounded-br-3xl`} />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-28 flex justify-center">
            {loading ? (
              <p className="text-white text-lg font-bold px-5 py-2 rounded-full bg-black/60 backdrop-blur-md">
                {LOADING_TEXTS[textIndex]}
              </p>
            ) : (
              <button
                onClick={handleShutter}
                aria-label="Take photo"
                className="w-20 h-20 rounded-full bg-white border-4 border-white/60 ring-4 ring-black/20 active:scale-95 transition-transform"
              />
            )}
          </div>
        </>
      )}

      {stickerBase64 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-6">
          <h2 className="text-2xl text-white font-black mb-5">New Cat Sticker!</h2>

          <div className="w-64 h-64 bg-white/10 rounded-3xl p-4 flex items-center justify-center mb-6 border border-white/20">
            <img
              src={stickerBase64}
              alt="Cat sticker preview"
              className="max-w-full max-h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)]"
            />
          </div>

          <div className="flex gap-2 w-full max-w-xs mb-4">
            <input
              type="text"
              placeholder="Name this cat..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              disabled={saving}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white text-black text-lg font-semibold outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setCatName(pickRandomName(catName))}
              disabled={saving}
              title="Random cat name"
              aria-label="Generate random cat name"
              className="px-4 py-3 rounded-xl bg-neutral-800 text-white text-xl font-bold border border-white/20 active:scale-95 transition-transform"
            >
              🎲
            </button>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => {
                setStickerBase64(null);
                setCatName("");
                resumeVideo();
              }}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-neutral-700 text-white font-bold"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-white text-black font-bold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to Dex"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute top-6 inset-x-4 flex justify-center z-50">
          <div className="flex items-center gap-3 bg-white text-black rounded-full pl-5 pr-2 py-2 shadow-lg">
            <span className="text-sm font-medium">{toast}</span>
            <button
              onClick={() => setToast("")}
              className="w-7 h-7 rounded-full bg-neutral-200 text-sm font-bold"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}