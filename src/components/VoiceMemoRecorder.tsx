import { AudioOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Input, Space, Typography, message } from "antd";
import { useEffect, useRef, useState } from "react";
import type { VoiceMemo } from "@/lib/contactsDb";

interface Props {
  value?: VoiceMemo;
  onChange: (memo: VoiceMemo | undefined) => void;
  /** When true, transcript field is read-only (used in the detail read view). */
  readOnly?: boolean;
}

const MAX_DURATION_MS = 30_000;

// Browsers prefix SpeechRecognition differently. We probe both at runtime.
function getSpeechRecognition(): { new (): SpeechRecognitionLike } | null {
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

export default function VoiceMemoRecorder({ value, onChange, readOnly }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [interim, setInterim] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const stopTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const recognitionUnavailableRef = useRef<boolean>(false);

  // Manage object URL lifecycle for the recorded blob, both in form-edit (where
  // value.audioBlob is the live recording) and detail-read (where value comes
  // from IndexedDB on open).
  useEffect(() => {
    if (!value?.audioBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value?.audioBlob]);

  // Stop everything if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  function cleanupStream() {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (recording || readOnly) return;
    setError(null);
    setInterim("");
    finalTranscriptRef.current = "";
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support microphone access.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone permission was blocked.");
      } else if (name === "NotFoundError") {
        setError("No microphone found on this device.");
      } else {
        setError("Could not start the microphone.");
      }
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => finishRecording();
    recorder.start();
    startTimeRef.current = Date.now();
    setRecording(true);

    // Speech recognition runs in parallel. If unavailable, the recording still
    // saves with an empty transcript.
    const Ctor = getSpeechRecognition();
    if (Ctor) {
      try {
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = navigator.language || "en-US";
        rec.onresult = (e) => {
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) {
              finalTranscriptRef.current = (
                finalTranscriptRef.current +
                " " +
                r[0].transcript
              ).trim();
            } else {
              interimText += r[0].transcript;
            }
          }
          setInterim(interimText);
        };
        rec.onerror = (e) => {
          // 'no-speech' / 'aborted' are common and not worth surfacing.
          if (e.error !== "no-speech" && e.error !== "aborted") {
            recognitionUnavailableRef.current = true;
          }
        };
        rec.onend = () => {
          recognitionRef.current = null;
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        recognitionUnavailableRef.current = true;
      }
    } else {
      recognitionUnavailableRef.current = true;
    }

    // Auto-stop at MAX_DURATION_MS so the user can't accidentally record a
    // 10-minute file by pressing-and-forgetting.
    stopTimeoutRef.current = window.setTimeout(() => {
      message.info("Recording capped at 30 seconds.");
      stopRecording();
    }, MAX_DURATION_MS);
  }

  function stopRecording() {
    if (!recording) return;
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function finishRecording() {
    setRecording(false);
    setInterim("");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Discard recordings under ~300ms — accidental tap.
    const duration = Date.now() - startTimeRef.current;
    if (duration < 300 || chunksRef.current.length === 0) {
      return;
    }

    const blob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || "audio/webm",
    });
    chunksRef.current = [];
    onChange({
      audioBlob: blob,
      transcript: finalTranscriptRef.current,
      recordedAt: Date.now(),
    });
  }

  function deleteMemo() {
    onChange(undefined);
    setError(null);
  }

  function reRecord() {
    onChange(undefined);
    setError(null);
    // Don't auto-start — user has to press-and-hold again to make it explicit.
  }

  // ---------- Render ----------

  // Recorded state — show audio player + transcript editor + actions.
  if (value && !recording) {
    return (
      <div className="cc-voice-memo">
        <div className="cc-voice-memo-label">Voice memo</div>
        {audioUrl && (
          <audio
            src={audioUrl}
            controls
            preload="metadata"
            className="cc-voice-memo-audio"
          />
        )}
        <Input.TextArea
          value={value.transcript}
          onChange={(e) =>
            onChange({ ...value, transcript: e.target.value })
          }
          placeholder={
            recognitionUnavailableRef.current
              ? "Transcription unavailable on this browser. Type notes here if you want."
              : "Transcript (edit if anything's off)"
          }
          autoSize={{ minRows: 2, maxRows: 6 }}
          readOnly={readOnly}
        />
        {!readOnly && (
          <Space style={{ marginTop: 8 }} wrap>
            <Button icon={<ReloadOutlined />} onClick={reRecord}>
              Re-record
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={deleteMemo}>
              Delete memo
            </Button>
          </Space>
        )}
      </div>
    );
  }

  // Read-only with no memo: nothing to show.
  if (readOnly) return null;

  // Idle state — hold-to-record button.
  return (
    <div className="cc-voice-memo">
      <div className="cc-voice-memo-label">Voice memo</div>
      <button
        type="button"
        className={`cc-voice-memo-mic ${recording ? "is-recording" : ""}`}
        // Mobile + desktop: press-and-hold semantics. We listen to both pointer
        // and touch events because Safari's pointer-event contextmenu on long
        // press can otherwise hijack touchstart.
        onPointerDown={(e) => {
          e.preventDefault();
          void startRecording();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        onPointerLeave={() => {
          if (recording) stopRecording();
        }}
        onPointerCancel={() => {
          if (recording) stopRecording();
        }}
        aria-pressed={recording}
        aria-label={recording ? "Recording — release to stop" : "Hold to record voice memo"}
      >
        <AudioOutlined />
        <span>
          {recording ? "Recording… release to stop" : "Hold to record"}
        </span>
      </button>
      {recording && interim && (
        <Typography.Text type="secondary" className="cc-voice-memo-interim">
          {interim}
        </Typography.Text>
      )}
      {error && (
        <Alert
          type="warning"
          showIcon
          message={error}
          style={{ marginTop: 8 }}
        />
      )}
      <div className="cc-voice-memo-hint">
        Up to 30 seconds. Stays on this device.
      </div>
    </div>
  );
}
