import { useState } from "react";
import {
  loadCollection,
  removeCatFromCollection,
  toImageSrc,
} from "../utils/collectionStorage";

const OUTLINE = [
  [2, 0], [-2, 0], [0, 2], [0, -2], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5],
]
  .map(([x, y]) => `drop-shadow(${x}px ${y}px 0 #fff)`)
  .join(" ");
const CARD_FILTER = `${OUTLINE} drop-shadow(0 8px 10px rgba(0,0,0,0.5))`;

export default function Collection() {
  const [cats, setCats] = useState(() => loadCollection());

  function handleDelete(id) {
    removeCatFromCollection(id);
    setCats(loadCollection());
  }

  return (
    <div className="min-h-full bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-5 pt-10 pb-32">
        <h1 className="text-5xl font-black tracking-tight">Yours</h1>
        <p className="mt-1 text-neutral-400">
          {cats.length} {cats.length === 1 ? "cat" : "cats"} collected
        </p>

        {cats.length === 0 ? (
          <div className="mt-24 text-center">
            <p className="text-6xl mb-4">🐾</p>
            <p className="text-lg font-semibold">No cats yet</p>
            <p className="text-neutral-400 mt-1">
              Go spot one with the camera and save it here.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cats.map((cat) => (
              <div
                key={cat.id}
                className="relative rounded-3xl bg-neutral-900 border border-neutral-800 p-4 flex flex-col items-center"
              >
                <button
                  onClick={() => handleDelete(cat.id)}
                  aria-label={`Delete ${cat.breed}`}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center hover:text-red-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M6 6l1 14h10l1-14" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
                <div className="h-32 w-full flex items-center justify-center mt-4">
                  <img
                    src={toImageSrc(cat.stickerBase64)}
                    alt={cat.breed}
                    style={{ filter: CARD_FILTER, transform: "rotate(-3deg)" }}
                    className="max-h-28 max-w-full object-contain"
                  />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-center leading-tight">
                  {cat.breed}
                </h2>
                <p className="text-xs text-neutral-300 mt-1">{cat.rarity}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {new Date(cat.savedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}