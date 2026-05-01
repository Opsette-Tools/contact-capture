import { CloseOutlined, RetweetOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (blob: Blob) => void;
  onUnavailable: (reason: string) => void;
  onClose: () => void;
}

const CARD_ASPECT = 3.5 / 2;

export default function CameraCapture({ onCapture, onUnavailable, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
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

  const startStream = useCallback(
    async (mode: "environment" | "user") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("This browser doesn't support live camera access. Opening the system camera instead.");
        return;
      }
      stopStream();
      setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        const name = (err as DOMException)?.name ?? "";
        let reason = "Could not start the camera. Opening the system camera instead.";
        if (name === "NotAllowedError" || name === "SecurityError") {
          reason = "Camera permission was blocked. Opening the system camera instead.";
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          reason = "No usable camera found. Opening the system camera instead.";
        } else if (name === "NotReadableError") {
          reason = "Camera is in use by another app. Opening the system camera instead.";
        }
        onUnavailable(reason);
      }
    },
    [onUnavailable, stopStream],
  );

  useEffect(() => {
    startStream(facingMode);
    return () => {
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
    startStream(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || !ready) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    // Video is rendered with object-fit: cover. Compute the scale + offsets
    // that map CSS pixels back to native video pixels.
    const scaleX = vw / videoRect.width;
    const scaleY = vh / videoRect.height;
    const scale = Math.max(scaleX, scaleY);
    const renderedW = vw / scale;
    const renderedH = vh / scale;
    const offsetX = (videoRect.width - renderedW) / 2;
    const offsetY = (videoRect.height - renderedH) / 2;

    const cropCssX = frameRect.left - videoRect.left - offsetX;
    const cropCssY = frameRect.top - videoRect.top - offsetY;

    const sx = Math.max(0, cropCssX * scale);
    const sy = Math.max(0, cropCssY * scale);
    const sw = Math.min(vw - sx, frameRect.width * scale);
    const sh = Math.min(vh - sy, frameRect.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="cc-camera-overlay" role="dialog" aria-label="Camera capture">
      <video
        ref={videoRef}
        className="cc-camera-video"
        autoPlay
        playsInline
        muted
      />

      <div className="cc-camera-mask" aria-hidden="true">
        <div
          ref={frameRef}
          className="cc-camera-frame"
          style={{ aspectRatio: `${CARD_ASPECT}` }}
        >
          <span className="cc-camera-corner cc-camera-corner-tl" />
          <span className="cc-camera-corner cc-camera-corner-tr" />
          <span className="cc-camera-corner cc-camera-corner-bl" />
          <span className="cc-camera-corner cc-camera-corner-br" />
        </div>
      </div>

      <div className="cc-camera-hint">Frame the card inside the box</div>

      <button
        type="button"
        className="cc-camera-close"
        onClick={onClose}
        aria-label="Close camera"
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

      <div className="cc-camera-controls">
        <button
          type="button"
          className="cc-camera-shutter"
          onClick={handleCapture}
          disabled={!ready}
          aria-label="Capture photo"
        >
          <span className="cc-camera-shutter-inner" />
        </button>
      </div>
    </div>
  );
}
