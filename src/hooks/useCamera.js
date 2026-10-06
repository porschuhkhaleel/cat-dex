import { useState, useRef, useEffect, useCallback } from 'react';

export const CAMERA_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
};

/**
 * Manages a getUserMedia video stream and exposes a ref to attach to a
 * <video> element, along with a permission/status state machine so the UI
 * can render the right message at each stage.
 */
export function useCamera({ facingMode = 'environment' } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(CAMERA_STATUS.IDLE);
  const [error, setError] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(CAMERA_STATUS.UNSUPPORTED);
      setError('This browser cannot access a camera.');
      return;
    }

    setStatus(CAMERA_STATUS.REQUESTING);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus(CAMERA_STATUS.GRANTED);
    } catch (err) {
      stopCamera();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus(CAMERA_STATUS.DENIED);
        setError('Camera permission was denied. Turn it on in your browser settings to start catching cats.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus(CAMERA_STATUS.ERROR);
        setError('No camera was found on this device.');
      } else {
        setStatus(CAMERA_STATUS.ERROR);
        setError(err.message || 'The camera could not be started.');
      }
    }
  }, [facingMode, stopCamera]);

  // Start on mount, always clean up the tracks on unmount so the camera
  // light turns off when the user navigates away.
  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, status, error, startCamera, stopCamera };
}
