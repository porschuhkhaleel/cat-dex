import { useEffect, useMemo, useState } from "react";
import { saveCatToCollection, toImageSrc } from "../../utils/collectionStorage";

const OUTLINE = [
  [3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2],
]
  .map(([x, y]) => `drop-shadow(${x}px ${y}px 0 #fff)`)
  .join(" ");
const STICKER_FILTER = `${OUTLINE} drop-shadow(0 14px 18px rgba(0,0,0,0.35)) drop-shadow(0 3px 4px rgba(0,0,0,0.25))`;

function makeRarity() {
  const r = Math.random();
  const tier =
    r < 0.55 ? "⚪ Common" : r < 0.82 ? "🔵 Rare" : r < 0.96 ? "🟣 Epic" : "🟡 Legendary";
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${tier} #${letter}${digits}`;
}

export default function IdentificationOverlay({ result, onClose, onRetake }) {
  const rarity = useMemo(makeRarity, [result]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const imposter = result.breed === "Not A";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    const ok = saveCatToCollection({
      breed: result.breed,
      confidence: result.confidence,
      funFacts: result.funFacts || [],
      stickerBase64: result.stickerBase64,
      rarity,
    });
    if (ok) {
      setSaved(true);
      setSaveError(false);
    } else {
      setSaveError(true);
    }
  }

  const title = imposter ? "Not a cat!!" : result.breed;
  const subtext = imposter ? "❌ Why are you scanning this?" : "🔥 First to spot this cat";
  const facts = Array.isArray(result.funFacts) ? result.funFacts : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-200 text-black">
      <div className="mx-auto max-w-md min-h-full flex flex-col px-5 pt-5 pb-10">
        <div className="flex justify-start">
          <button
            onClick={onClose}
            className="rounded-full bg-white border border-neutral-300 px-4 py-1.5 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        <div className="flex justify-center py-8">
          <img
            src={toImageSrc(result.stickerBase64)}
            alt={title}
            style={{ filter: STICKER_FILTER, transform: "rotate(-3deg)" }}
            className="max-h-72 w-auto object-contain"
          />
        </div>

        <div className="flex flex-col items-start gap-2">
          {imposter ? (
            <span className="rounded-full bg-red-600 text-white text-sm font-bold px-3 py-1">
              🚨 Imposter
            </span>
          ) : (
            <span className="rounded-full bg-white border border-neutral-300 text-sm font-bold px-3 py-1">
              {rarity}
            </span>
          )}
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-neutral-600 font-medium">{subtext}</p>
        </div>

        {!imposter && facts.length > 0 && (
          <ol className="mt-6 flex flex-col gap-3">
            {facts.map((fact, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-white border border-neutral-300 p-4"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{fact}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {!imposter && (
            <button
              onClick={handleSave}
              disabled={saved}
              className="rounded-full bg-black text-white font-semibold py-3.5 disabled:opacity-60"
            >
              {saved ? "Saved ✓" : saveError ? "Storage full — couldn't save" : "Save to Collection"}
            </button>
          )}
          <button
            onClick={onRetake}
            className="rounded-full bg-white border border-neutral-400 font-semibold py-3.5"
          >
            Retake photo
          </button>
        </div>
      </div>
    </div>
  );
}