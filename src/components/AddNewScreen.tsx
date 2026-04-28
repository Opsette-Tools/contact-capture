import { CheckCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, message, Space } from "antd";
import { useState } from "react";
import CardScanner from "./CardScanner";
import ContactForm from "./ContactForm";
import { newContact, putContact, type Contact } from "@/lib/contactsDb";
import type { ParsedCard } from "@/lib/ocr";

interface Props {
  onSaved: () => void;
  onViewList: () => void;
}

type Step = "scan" | "form" | "saved";

export default function AddNewScreen({ onSaved, onViewList }: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [draft, setDraft] = useState<Contact>(newContact());
  const [prefill, setPrefill] = useState<Partial<Contact> | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDraft(newContact());
    setPrefill(undefined);
    setStep("scan");
  };

  const handleParsed = (parsed: ParsedCard) => {
    setPrefill({
      name: parsed.name,
      company: parsed.company,
      email: parsed.email,
      phone: parsed.phone,
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
      <CheckCircleOutlined style={{ fontSize: 48, color: "#16A34A" }} />
      <h2 style={{ margin: 0 }}>Saved!</h2>
      <p style={{ color: "#7a6f5a", margin: 0 }}>
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
