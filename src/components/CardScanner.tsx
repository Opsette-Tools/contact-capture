import {
  CameraOutlined,
  LoadingOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { Alert, Button, Progress, Upload } from "antd";
import { useRef, useState } from "react";
import CameraCapture from "./CameraCapture";
import { runOcr, type ParsedCard } from "@/lib/ocr";

interface Props {
  onParsed: (parsed: ParsedCard) => void;
  onSkip: () => void;
}

export default function CardScanner({ onParsed, onSkip }: Props) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const systemCameraRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | Blob) => {
    setError(null);
    setProgress(0);
    setRunning(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const parsed = await runOcr(file, setProgress);
      onParsed(parsed);
    } catch (e) {
      console.error(e);
      setError("Could not read that image. You can still enter details manually.");
    } finally {
      setRunning(false);
    }
  };

  const handleCameraCapture = (blob: Blob) => {
    setCameraOpen(false);
    handleFile(blob);
  };

  const handleCameraUnavailable = (reason: string) => {
    setCameraOpen(false);
    setError(reason);
    // Fall back to the system camera so the user still gets to take a photo
    // without re-tapping. Wrapped in setTimeout because some browsers ignore
    // .click() if it fires synchronously inside the same event loop tick.
    setTimeout(() => {
      systemCameraRef.current?.click();
    }, 50);
  };

  const handleSystemCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="cc-stack">
      <div className="cc-scanner-drop">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Card preview"
            style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 12 }}
          />
        )}
        <div className="cc-scanner-hint">
          Take a photo or upload a business card. We'll prefill the fields.
        </div>

        <div className="cc-scanner-actions">
          <Button
            type="primary"
            icon={running ? <LoadingOutlined /> : <CameraOutlined />}
            disabled={running}
            size="large"
            onClick={() => setCameraOpen(true)}
            block
          >
            {running ? "Reading card…" : "Take photo with camera"}
          </Button>

          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              handleFile(file as File);
              return false;
            }}
            disabled={running}
          >
            <Button
              icon={<PictureOutlined />}
              disabled={running}
              size="large"
              block
            >
              Upload from library
            </Button>
          </Upload>
        </div>

        {/* Hidden input used as the fallback when getUserMedia is unavailable.
            capture="environment" asks the OS to open the rear camera directly. */}
        <input
          ref={systemCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleSystemCameraChange}
        />

        {running && (
          <div style={{ marginTop: 12 }}>
            <Progress percent={progress} size="small" />
          </div>
        )}
      </div>

      {error && <Alert type="warning" showIcon message={error} />}

      <Button block onClick={onSkip} disabled={running}>
        Skip — enter manually
      </Button>

      {cameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onUnavailable={handleCameraUnavailable}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
