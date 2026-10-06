import { useState, useRef, useCallback, useEffect } from 'react';

export const LOCATION_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
};

/**
 * Wraps the Geolocation API. Watching only starts when startWatching() is
 * called (i.e. when the user flips the map toggle on) so we never prompt
 * for location permission until it's actually needed.
 */
export function useGeolocation() {
  const [status, setStatus] = useState(LOCATION_STATUS.IDLE);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus((prev) => (prev === LOCATION_STATUS.GRANTED ? LOCATION_STATUS.IDLE : prev));
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus(LOCATION_STATUS.UNSUPPORTED);
      setError('This browser cannot report your location.');
      return;
    }

    setStatus(LOCATION_STATUS.REQUESTING);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus(LOCATION_STATUS.GRANTED);
      },
      (err) => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (err.code === err.PERMISSION_DENIED) {
          setStatus(LOCATION_STATUS.DENIED);
          setError('Location permission was denied, so the map stamp is turned off.');
        } else {
          setStatus(LOCATION_STATUS.ERROR);
          setError(err.message || 'Your location could not be determined.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { status, coords, error, startWatching, stopWatching };
}
