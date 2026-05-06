import { CheckCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, message, Space } from "antd";
import { useEffect, useState } from "react";
import CardScanner from "./CardScanner";
import ContactForm from "./ContactForm";
import {
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
}

type Step = "scan" | "form" | "saved";

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

export default function AddNewScreen({ onSaved, onViewList, activeEvent }: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [draft, setDraft] = useState<Contact>(() => buildDraft(activeEvent));
  const [prefill, setPrefill] = useState<Partial<Contact> | undefined>();
  const [saving, setSaving] = useState(false);

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

  const reset = () => {
    setDraft(buildDraft(activeEvent));
    setPrefill(undefined);
    setStep("scan");
  };

  const handleParsed = (parsed: ParsedCard) => {
    setPrefill({
      name: parsed.name,
      company: parsed.company,
      email: parsed.email,
      phone: parsed.phone,
      website: parsed.website,
    });
    setStep("form");
  };

  const handleSkip = () => {
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
        onCancel={() => setStep("scan")}
      />
    );
  }

  return (
    <div className="cc-stack" style={{ textAlign: "center", paddingTop: 24 }}>
      <CheckCircleOutlined style={{ fontSize: 48, color: "var(--cc-color-accent)" }} />
      <h2 style={{ margin: 0 }}>Saved!</h2>
      <p style={{ color: "var(--cc-color-text-muted)", margin: 0 }}>
        Your contact is stored on this device.
      </p>
      <Space className="cc-success-actions" style={{ justifyContent: "center" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={reset}>
          Add another contact
        </Button>
        <Button onClick={onViewList}>View contacts</Button>
      </Space>
    </div>
  );
}
