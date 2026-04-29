import { CameraOutlined, LoadingOutlined } from "@ant-design/icons";
import { Alert, Button, Progress, Upload } from "antd";
import { useState } from "react";
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

  const handleFile = async (file: File) => {
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
            type="primary"
            icon={running ? <LoadingOutlined /> : <CameraOutlined />}
            disabled={running}
            size="large"
          >
            {running ? "Reading card…" : "Scan card"}
          </Button>
        </Upload>
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
    </div>
  );
}
