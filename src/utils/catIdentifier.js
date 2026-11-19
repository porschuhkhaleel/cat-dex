import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

let modelPromise = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = tf.ready().then(() => mobilenet.load({ version: 2, alpha: 0.5 }));
  }
  return modelPromise;
}

const CAT_PROFILES = {
  tabby: {
    breed: "Tabby",
    rarity: "Common",
    funFact: "Most tabbies have a faint 'M' marking on their forehead.",
  },
  "tiger cat": {
    breed: "Tiger Cat",
    rarity: "Uncommon",
    funFact: "Tiger-striped mackerel tabbies are the closest look to wildcats.",
  },
  "egyptian cat": {
    breed: "Egyptian Mau",
    rarity: "Rare",
    funFact: "Egyptian Maus are the fastest domestic cat breed, hitting up to 30 mph.",
  },
  "persian cat": {
    breed: "Persian",
    rarity: "Rare",
    funFact: "Persians are one of the oldest known cat breeds, prized for their plush coats.",
  },
  "siamese cat": {
    breed: "Siamese",
    rarity: "Uncommon",
    funFact: "Siamese coats are heat-sensitive—their ears, face, and tail grow darker in cooler spots.",
  },
  lynx: {
    breed: "Wild Lynx",
    rarity: "Legendary",
    funFact: "Lynx have tufted ears that act like hearing aids in the wild.",
  },
};

export async function identifyCat(imageElement) {
  const model = await getModel();
  const predictions = await model.classify(imageElement, 5);

  for (const pred of predictions) {
    const label = pred.className.toLowerCase();
    for (const [key, profile] of Object.entries(CAT_PROFILES)) {
      if (label.includes(key)) {
        return {
          isCat: true,
          ...profile,
          confidence: Math.round(pred.probability * 100),
        };
      }
    }
  }

  return {
    isCat: false,
    breed: "Mystery Cat",
    rarity: "Common",
    funFact: "A mysterious feline that defies classification.",
    confidence: 0,
  };
}