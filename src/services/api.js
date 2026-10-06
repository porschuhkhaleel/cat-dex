const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Sends the composited photo (and, if available, the coordinates it was
 * captured at) to the Python backend for breed identification.
 *
 * Expected response shape:
 *   { breed: string, confidence: number, funFacts: string[] }
 */
export async function identifyCat(imageBlob, coords, authToken) {
  const formData = new FormData();
  formData.append('image', imageBlob, 'capture.jpg');
  if (coords) {
    formData.append('latitude', String(coords.latitude));
    formData.append('longitude', String(coords.longitude));
  }

  const response = await fetch(`${API_BASE_URL}/api/identify`, {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Identification request failed (${response.status}).`);
  }

  return response.json();
}
