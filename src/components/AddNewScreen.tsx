import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { Button, message, Space } from "antd";
import { useEffect, useState } from "react";
import CardScanner from "./CardScanner";
import ContactForm from "./ContactForm";
import {
  getSelf,
  newContact,
  putContact,
  todayLocalIso,
  type Contact,
  type Event,
} from "@/lib/contactsDb";
import type { ParsedCard } from "@/lib/ocr";

interface Props {
  onSaved: () => void;
  onViewList: () => void;
  /** When set, new contacts are pre-tagged with this event's id/name and
   *  metDate = today. User can still clear it in the form. */
  activeEvent?: Event;
  /** Open the My Card drawer (showing the user's own QR). Used by the
   *  reciprocal "Show them yours back" CTA on the saved screen. */
  onShowMyCard?: () => void;
}

type Step = "scan" | "form" | "saved";
type EntryMode = "qr" | "ocr" | "manual";

function buildDraft(activeEvent?: Event): Contact {
  const draft = newContact();
  if (activeEvent) {
    draft.eventId = activeEvent.id;
    draft.eventName = activeEvent.name;
    draft.metDate = activeEvent.date || todayLocalIso();
    if (activeEvent.location) draft.metAt = activeEvent.location;
  }
  return draft;
}

export default function AddNewScreen({
  onSaved,
  onViewList,
  activeEvent,
  onShowMyCard,
}: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [draft, setDraft] = useState<Contact>(() => buildDraft(activeEvent));
  const [prefill, setPrefill] = useState<Partial<Contact> | undefined>();
  const [saving, setSaving] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  // null = check hasn't resolved yet, true/false = result. Keeps the saved
  // screen rendering optimistically while we read from IndexedDB.
  const [hasSelfCard, setHasSelfCard] = useState<boolean | null>(null);

  // If the active event changes mid-session (e.g. user creates an event from
  // the banner CTA), refresh the draft so the new contact picks it up.
  useEffect(() => {
    setDraft((prev) => {
      // Only auto-update if the form hasn't been edited yet (everything but
      // event/met fields is still default).
      const isPristine =
        !prev.name && !prev.company && !prev.position && !prev.email && !prev.phone;
      if (!isPristine) return prev;
      return buildDraft(activeEvent);
    });
  }, [activeEvent]);

  // Resolve hasSelfCard whenever we land on the saved step. The check is one
  // IndexedDB read; if it lags, the button label stays optimistic ("Show them
  // yours back") until the result swaps it.
  useEffect(() => {
    if (step !== "saved") return;
    let cancelled = false;
    void (async () => {
      const stored = await getSelf();
      if (cancelled) return;
      setHasSelfCard(!!(stored && stored.name));
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const reset = () => {
    setDraft(buildDraft(activeEvent));
    setPrefill(undefined);
    setEntryMode("manual");
    setHasSelfCard(null);
    setStep("scan");
  };

  const handleParsed = (parsed: ParsedCard) => {
    setEntryMode(parsed.source === "qr" ? "qr" : "ocr");
    setPrefill({
      name: parsed.name,
      company: parsed.company,
      position: parsed.position,
      email: parsed.email,
      phone: parsed.phone,
      website: parsed.website,
    });
    setStep("form");
  };

  const handleSkip = () => {
    setEntryMode("manual");
    setPrefill(undefined);
    setStep("form");
  };

  const handleSave = async (values: Contact) => {
    setSaving(true);
    try {
      await putContact(values);
      onSaved();
      setStep("saved");
      message.success("Contact saved");
    } finally {
      setSaving(false);
    }
  };

  if (step === "scan") {
    return <CardScanner onParsed={handleParsed} onSkip={handleSkip} />;
  }

  if (step === "form") {
    return (
      <ContactForm
        initial={draft}
        prefill={prefill}
        saving={saving}
        onSubmit={handleSave}
        onCancel={() => {
          setEntryMode("manual");
          setStep("scan");
        }}
      />
    );
  }

  // ----- saved step -----

  const showReciprocal = entryMode === "qr" && !!onShowMyCard;
  // While hasSelfCard is null we render optimistically as if the user has a
  // card (QR icon + "Show them yours back"). If the IndexedDB check returns
  // false, swap to the setup-prompt label without re-laying-out the screen.
  const reciprocalNeedsSetup = hasSelfCard === false;

  const subhead =
    showReciprocal && hasSelfCard !== false
      ? "Saved! Now share yours back so they have you too."
      : "Your contact is stored on this device.";

  return (
    <div className="cc-stack" style={{ textAlign: "center", paddingTop: 24 }}>
      <CheckCircleOutlined style={{ fontSize: 48, color: "var(--cc-color-accent)" }} />
      <h2 style={{ margin: 0 }}>Saved!</h2>
      <p style={{ color: "var(--cc-color-text-muted)", margin: 0 }}>{subhead}</p>
      <Space className="cc-success-actions" style={{ justifyContent: "center" }}>
        {showReciprocal && (
          <Button
            type="primary"
            size="large"
            icon={reciprocalNeedsSetup ? <EditOutlined /> : <QrcodeOutlined />}
            onClick={onShowMyCard}
          >
            {reciprocalNeedsSetup
              ? "Set up your card to share back"
              : "Show them yours back"}
          </Button>
        )}
        <Button
          type={showReciprocal ? "default" : "primary"}
          icon={<PlusOutlined />}
          onClick={reset}
        >
          Add another contact
        </Button>
        <Button type="text" onClick={onViewList}>
          View contacts
        </Button>
      </Space>
    </div>
  );
}
