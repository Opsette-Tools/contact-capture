import { CloseOutlined, RetweetOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface Props {
  onScanned: (decoded: string) => void;
  onUnavailable: (reason: string) => void;
  onClose: () => void;
}

// Throttle decode attempts. jsQR is fast on a small ImageData but full-rate
// scanning (60 fps) drains the battery and trips Safari's main-thread
// budget. 6 attempts/sec is plenty for "hold the camera steady on a QR."
const DECODE_INTERVAL_MS = 1000 / 6;

// If we haven't decoded anything after this long, surface a help toast so the
// user knows the scanner is alive but nothing's matching.
const STALE_HINT_MS = 15_000;

// Sample the video at roughly this width before running jsQR. The decoder
// gets quadratically slower with image size, and a 480px-wide frame is more
// than enough resolution to detect QRs at typical phone-screen distances.
const SAMPLE_WIDTH = 480;

export default function QrScanner({ onScanned, onUnavailable, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastAttemptAtRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const staleHintFiredRef = useRef<boolean>(false);
  const scannedRef = useRef<boolean>(false);

  const [ready, setReady] = useState(false);
  const [hit, setHit] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (scannedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const now = performance.now();

    // Stale hint — fire once.
    if (
      !staleHintFiredRef.current &&
      startedAtRef.current > 0 &&
      now - startedAtRef.current > STALE_HINT_MS
    ) {
      staleHintFiredRef.current = true;
      message.info("Still looking — make sure the QR is well-lit and centered");
    }

    if (now - lastAttemptAtRef.current < DECODE_INTERVAL_MS) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastAttemptAtRef.current = now;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Downscale to SAMPLE_WIDTH while preserving aspect ratio.
    const scale = Math.min(1, SAMPLE_WIDTH / vw);
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    try {
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, {
        inversionAttempts: "dontInvert",
      });
      if (code && code.data) {
        scannedRef.current = true;
        setHit(true);
        navigator.vibrate?.(50);
        // Brief flash before handing off so the user sees the lock-on cue.
        setTimeout(() => onScanned(code.data), 160);
        return;
      }
    } catch {
      // drawImage / getImageData can throw on iOS Safari mid-orientation
      // change; ignore and retry next frame.
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onScanned]);

  const startStream = useCallback(
    async (mode: "environment" | "user") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("This browser doesn't support live camera access.");
        return;
      }
      stopStream();
      setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
        startedAtRef.current = performance.now();
        staleHintFiredRef.current = false;
        scannedRef.current = false;
        lastAttemptAtRef.current = 0;
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        const name = (err as DOMException)?.name ?? "";
        let reason = "Could not start the camera.";
        if (name === "NotAllowedError" || name === "SecurityError") {
          reason = "Camera permission was blocked.";
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          reason = "No usable camera found.";
        } else if (name === "NotReadableError") {
          reason = "Camera is in use by another app.";
        }
        onUnavailable(reason);
      }
    },
    [onUnavailable, stopStream, tick],
  );

  useEffect(() => {
    void startStream(facingMode);
    return () => {
      stopLoop();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cams = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(cams.length > 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSwitchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    void startStream(next);
  };

  return (
    <div className="cc-camera-overlay" role="dialog" aria-label="Scan QR">
      <video
        ref={videoRef}
        className="cc-camera-video"
        autoPlay
        playsInline
        muted
      />

      <div className="cc-camera-mask" aria-hidden="true">
        <div
          className={`cc-camera-frame cc-camera-frame--square${hit ? " is-hit" : ""}`}
        >
          <span className="cc-camera-corner cc-camera-corner-tl" />
          <span className="cc-camera-corner cc-camera-corner-tr" />
          <span className="cc-camera-corner cc-camera-corner-bl" />
          <span className="cc-camera-corner cc-camera-corner-br" />
        </div>
      </div>

      <div className="cc-camera-hint">
        {ready ? "Point at a Contact Capture QR" : "Starting camera…"}
      </div>

      <button
        type="button"
        className="cc-camera-close"
        onClick={onClose}
        aria-label="Close scanner"
      >
        <CloseOutlined />
      </button>

      {hasMultipleCameras && (
        <Button
          className="cc-camera-switch"
          shape="circle"
          icon={<RetweetOutlined />}
          onClick={handleSwitchCamera}
          aria-label="Switch camera"
        />
      )}

      {/* Hidden — used only for pulling ImageData out of the video. */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
