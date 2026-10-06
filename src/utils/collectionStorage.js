const KEY = "catdex:collection:v1";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function loadCollection() {
  return readAll().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export function saveCatToCollection(cat) {
  if (!cat || cat.breed === "Not A") return false;
  try {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      breed: cat.breed,
      confidence: cat.confidence,
      funFacts: cat.funFacts || [],
      stickerBase64: cat.stickerBase64,
      rarity: cat.rarity,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify([entry, ...readAll()]));
    return true;
  } catch (err) {
    return false;
  }
}

export function removeCatFromCollection(id) {
  try {
    const next = readAll().filter((c) => c.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch (err) {
    return false;
  }
}

export function toImageSrc(image) { return image; }