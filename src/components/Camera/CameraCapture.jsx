import { useEffect, useRef, useState } from "react";
import IdentificationOverlay from "./IdentificationOverlay";

const IDENTIFY_ROUTE = "/api/identify"; // change to match your backend
const FIELD_NAME = "file"; // change to match your backend
const MAX_SIDE = 1280;
const LOADING_TEXTS = [
  "Locking in...",
  "Looking at your shot...",
  "Finding the cat...",
  "Peeling it off...",
];

export default function CameraCapture() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState("");
  const [loading, setLoading] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setCamError(
            err && err.name === "NotAllowedError"
              ? "Camera access was blocked. Please allow camera permission in your browser settings and reload."
              : "We couldn't start your camera. Make sure one is available and you're on HTTPS or localhost."
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
      1400
    );
    return () => clearInterval(id);
  }, [loading]);

  function resumeVideo() {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }

  function showError(msg) {
    setToast(msg);
    resumeVideo();
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || loading || !video.videoWidth) return;
    setLoading(true);
    setToast("");
    video.pause();
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Could not capture image");

      const form = new FormData();
      form.append(FIELD_NAME, blob, "cat.jpg");
      const res = await fetch(import.meta.env.VITE_API_BASE_URL + IDENTIFY_ROUTE, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Bad status " + res.status);
      const data = await res.json();
      if (data.success === false) throw new Error("Backend reported failure");
      setResult(data);
    } catch (err) {
      showError("Couldn't identify that one. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function closeOverlay() {
    setResult(null);
    resumeVideo();
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
          <p className="text-white text-lg font-bold px-5 py-2 rounded-full bg-black/50 backdrop-blur-md">
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

      {toast && (
        <div className="absolute top-6 inset-x-4 flex justify-center">
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

      {result && (
        <IdentificationOverlay
          result={result}
          onClose={closeOverlay}
          onRetake={closeOverlay}
        />
      )}
    </div>
  );
}