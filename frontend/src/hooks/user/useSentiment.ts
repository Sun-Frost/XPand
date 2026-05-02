import { useState, useRef, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SentimentLabel = "happy" | "neutral" | "nervous" | "angry" | "confident" | "unknown";

export interface SentimentResult {
  label: SentimentLabel;
  confidence: number;
  rawExpressions?: Record<string, number>;
}

export type CameraPermission = "pending" | "granted" | "denied" | "unsupported";

export interface UseSentimentReturn {
  permission: CameraPermission;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isAnalysing: boolean;
  lastSentiment: SentimentResult | null;
  cameraError: string | null;
  requestPermission: () => Promise<void>;
  captureAndAnalyse: () => Promise<SentimentResult>;
  stopCamera: () => void;
}

// ---------------------------------------------------------------------------
// Expression → SentimentLabel mapping
// face-api detects: neutral, happy, sad, angry, fearful, disgusted, surprised
// ---------------------------------------------------------------------------

function expressionsToSentiment(expressions: Record<string, number>): SentimentResult {
  const { fearful = 0, sad = 0, angry = 0, disgusted = 0, happy = 0, neutral = 0, surprised = 0 } = expressions;

  // Nervous = any meaningful anxiety blend, even if no single emotion dominates
  const nervousScore = fearful * 1.5 + sad * 0.8 + disgusted * 0.5 + (1 - happy) * 0.3;
  const confidentScore = happy * 1.2 + neutral * 0.6;
  const angryScore = angry * 1.5 + disgusted * 0.8;

  const scores: Record<SentimentLabel, number> = {
    nervous: nervousScore,
    confident: confidentScore,
    angry: angryScore,
    happy: happy * 1.5,
    neutral: neutral,
    unknown: 0,
  };

  const [label, confidence] = Object.entries(scores).sort(([, a], [, b]) => b - a)[0] as [SentimentLabel, number];

  return { label, confidence: Math.min(confidence, 1), rawExpressions: expressions };
}

// ---------------------------------------------------------------------------
// face-api.js CDN loader — singleton, with proper state machine
// ---------------------------------------------------------------------------

let faceApiState: "idle" | "loading" | "ready" | "failed" = "idle";
const faceApiWaiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];

async function loadFaceApi(): Promise<void> {
  if (faceApiState === "ready") return;
  if (faceApiState === "failed") throw new Error("face-api.js failed to load previously. Refresh to retry.");

  if (faceApiState === "loading") {
    return new Promise((resolve, reject) => {
      faceApiWaiters.push({ resolve, reject });
    });
  }

  faceApiState = "loading";

  return new Promise((resolve, reject) => {
    // Already on window from a previous load (e.g. HMR)
    // @ts-expect-error global
    if (window.faceapi?.nets) {
      faceApiState = "ready";
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = async () => {
      try {
        // @ts-expect-error global
        const faceapi = window.faceapi;
        if (!faceapi) throw new Error("faceapi not on window after script load");

        const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
]);

        faceApiState = "ready";
        faceApiWaiters.forEach((w) => w.resolve());
        faceApiWaiters.length = 0;
        resolve();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        faceApiState = "failed";
        faceApiWaiters.forEach((w) => w.reject(e));
        faceApiWaiters.length = 0;
        reject(e);
      }
    };

    script.onerror = () => {
      const e = new Error("Failed to load face-api.js from CDN.");
      faceApiState = "failed";
      faceApiWaiters.forEach((w) => w.reject(e));
      faceApiWaiters.length = 0;
      reject(e);
    };

    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Helper: attach a MediaStream to a video element.
// IMPORTANT: this function must NEVER throw — it is called both inside and
// outside of the getUserMedia try/catch, and any exception would be
// misidentified as a permission denial.
// ---------------------------------------------------------------------------
function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream): void {
  try {
    if (video.srcObject === stream) return; // already attached
    video.srcObject = stream;
    // play() returns a Promise — we must handle its rejection here
    // so it can never propagate upward.
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked by browser policy — non-fatal.
        // The video will play once the user interacts with the page.
      });
    }
  } catch {
    // Synchronous errors from srcObject assignment — swallow silently.
  }
}

// ---------------------------------------------------------------------------
// useSentiment
// ---------------------------------------------------------------------------

export function useSentiment(): UseSentimentReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use a ref for permission so async closures (captureAndAnalyse) are never stale
  const permissionRef = useRef<CameraPermission>("pending");

  const [permission, _setPermission] = useState<CameraPermission>("pending");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [lastSentiment, setLastSentiment] = useState<SentimentResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const setPermission = useCallback((p: CameraPermission) => {
    permissionRef.current = p;
    _setPermission(p);
  }, []);

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // KEY FIX: whenever permission becomes "granted" and we have a stream,
  // ensure the stream is attached to the video element. This handles the
  // case where the video element wasn't in the DOM yet when getUserMedia
  // resolved (e.g. the component hadn't rendered yet).
  useEffect(() => {
    if (permission === "granted" && streamRef.current && videoRef.current) {
      attachStreamToVideo(videoRef.current, streamRef.current);
    }
  }, [permission]);

  // KEY FIX: also re-attach if the video element mounts AFTER permission is granted.
  // We use a MutationObserver-style approach via a ref callback isn't available here,
  // but the useEffect above covers the React render cycle correctly.

  const requestPermission = useCallback(async () => {
    setCameraError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setPermission("unsupported");
      setCameraError("Camera API is not supported in this browser or context (HTTPS required).");
      return;
    }

    // If we already have a live stream, just reattach — don't re-prompt
    if (streamRef.current && streamRef.current.getTracks().some((t) => t.readyState === "live")) {
      setPermission("granted");
      if (videoRef.current) attachStreamToVideo(videoRef.current, streamRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      // Set permission to "granted" BEFORE attaching the stream.
      // attachStreamToVideo is called OUTSIDE this try/catch (see below)
      // so that autoplay errors can never be mistaken for permission denial.
      setPermission("granted");

      // Preload face-api models in background — don't block the UI
      loadFaceApi().catch(() => {
        faceApiState = "idle"; // allow retry
      });

    } catch (err) {
      const domErr = err as DOMException;
      const name = domErr?.name ?? "";
      const message = (err as Error)?.message ?? "";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermission("denied");
        setCameraError("Camera access was denied. Check your browser site settings and try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setPermission("unsupported");
        setCameraError("No camera was found on this device.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        // Camera is in use — this is transient, allow retry
        setPermission("pending");
        setCameraError("Camera is in use by another app. Close it and try again.");
      } else if (name === "OverconstrainedError") {
        // Retry with no constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          setPermission("granted");
          if (videoRef.current) attachStreamToVideo(videoRef.current, stream);
          loadFaceApi().catch(() => { faceApiState = "idle"; });
        } catch {
          setPermission("denied");
          setCameraError(`Camera constraint error: ${message || name}`);
        }
      } else if (name === "AbortError") {
        // Transient — allow retry
        setPermission("pending");
        setCameraError("Camera request was interrupted. Please try again.");
      } else {
        // Unknown error — set to pending so user can retry
        setPermission("pending");
        setCameraError(`Camera error: ${message || name || "Unknown error"}. Please try again.`);
      }
    }

    // Attach stream to video OUTSIDE the try/catch so that any
    // autoplay DOMException (NotAllowedError from browser policy) can
    // NEVER be caught above and misidentified as a permission denial.
    // attachStreamToVideo handles its own errors internally.
    if (streamRef.current && videoRef.current) {
      attachStreamToVideo(videoRef.current, streamRef.current);
    }
    // If videoRef isn't mounted yet, the useEffect watching `permission`
    // will call attachStreamToVideo on the next render cycle.
  }, [setPermission]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPermission("pending");
    setCameraError(null);
  }, [setPermission]);

 const captureAndAnalyse = useCallback(async (): Promise<SentimentResult> => {
  const fallback: SentimentResult = { label: "neutral", confidence: 0.5 };
  if (permissionRef.current !== "granted") return fallback;

  const video = videoRef.current;
  if (!video || video.readyState < 2) return fallback;

  setIsAnalysing(true);

  try {
    // Wait for models to fully load
    if (faceApiState !== "ready") {
      await loadFaceApi();
    }

    // @ts-expect-error global
    const faceapi = window.faceapi;
    if (!faceapi) throw new Error("faceapi not available");

    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }))
      .withFaceExpressions();

    if (!detection) {
      const result: SentimentResult = { label: "neutral", confidence: 0.3 };
      setLastSentiment(result);
      return result;
    }

    const result = expressionsToSentiment(detection.expressions as Record<string, number>);
    setLastSentiment(result);
    return result;
  } catch (err) {
    console.error("Face API error:", err);
    return fallback;
  } finally {
    setIsAnalysing(false);
  }
}, []); // No dependency on `permission` — uses permissionRef

  return {
    permission,
    videoRef,
    isAnalysing,
    lastSentiment,
    cameraError,
    requestPermission,
    captureAndAnalyse,
    stopCamera,
  };
}