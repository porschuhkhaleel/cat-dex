// Canvas image-compositing helpers for the camera capture flow.
//
// The pipeline is:
//   1. drawVideoFrameToCanvas  -> paints the live <video> frame onto a canvas
//   2. stampMapOntoCanvas      -> (optional) fetches a static map image for
//                                 the current GPS coords and draws it into
//                                 the bottom-right corner, clipped to a
//                                 rounded rectangle with a white border
//   3. canvasToBlob/DataUrl    -> exports the final composite for upload/preview

const MAP_STAMP_WIDTH_RATIO = 0.32; // stamp is ~32% of the photo's width
const MAP_STAMP_MARGIN_RATIO = 0.03;
const MAP_STAMP_CORNER_RADIUS = 12;

/**
 * Draws the current frame of a playing <video> element onto a canvas at the
 * video's native resolution. Resizes the canvas to match.
 */
export function drawVideoFrameToCanvas(video, canvas) {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    throw new Error('Video stream is not ready yet.');
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

/**
 * Builds a static map image URL for a given coordinate pair.
 * Uses the Mapbox Static Images API by default. Swap this out for Google's
 * Static Maps API (or any other provider) if you'd rather use that -- just
 * keep the same (coords, { width, height, zoom }) => url signature.
 */
export function buildStaticMapUrl({ latitude, longitude }, { width = 300, height = 300, zoom = 15 } = {}) {
  const token = process.env.REACT_APP_MAPBOX_TOKEN;
  if (!token) {
    throw new Error(
      'Missing REACT_APP_MAPBOX_TOKEN. Add a Mapbox access token to your .env file to enable map stamping.'
    );
  }

  const marker = `pin-s+f2a93b(${longitude},${latitude})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${marker}/` +
    `${longitude},${latitude},${zoom},0/${width}x${height}@2x` +
    `?access_token=${token}`
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required so the resulting canvas isn't marked "tainted" and can still
    // be exported with toBlob/toDataURL once the map tile loads.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The map image failed to load.'));
    img.src = src;
  });
}

function traceRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Fetches a static map for `coords` and stamps it into the bottom-right
 * corner of `canvas`, clipped to a rounded rectangle with a white border.
 * Mutates and returns the same canvas.
 */
export async function stampMapOntoCanvas(canvas, coords) {
  const ctx = canvas.getContext('2d');
  const stampWidth = Math.round(canvas.width * MAP_STAMP_WIDTH_RATIO);
  const stampHeight = stampWidth;
  const margin = Math.round(canvas.width * MAP_STAMP_MARGIN_RATIO);

  const mapUrl = buildStaticMapUrl(coords, { width: stampWidth, height: stampHeight });
  const mapImage = await loadImage(mapUrl);

  const x = canvas.width - stampWidth - margin;
  const y = canvas.height - stampHeight - margin;

  ctx.save();
  traceRoundedRect(ctx, x, y, stampWidth, stampHeight, MAP_STAMP_CORNER_RADIUS);
  ctx.clip();
  ctx.drawImage(mapImage, x, y, stampWidth, stampHeight);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  traceRoundedRect(ctx, x, y, stampWidth, stampHeight, MAP_STAMP_CORNER_RADIUS);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

/** Promise wrapper around canvas.toBlob for uploading the final composite. */
export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The photo could not be exported.'));
    }, type, quality);
  });
}

/** Synchronous data URL export, handy for an immediate <img> preview. */
export function canvasToDataUrl(canvas, type = 'image/jpeg', quality = 0.92) {
  return canvas.toDataURL(type, quality);
}
