import {
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Popconfirm, message } from "antd";
import { useEffect, useState } from "react";
import type { Contact } from "@/lib/contactsDb";
import { canShareFiles, shareSingleVcard } from "@/lib/exporters";
import { emitContactToOpsette, isEmbedded } from "@/lib/storage";
import TagBadge from "./TagBadge";
import VoiceMemoRecorder from "./VoiceMemoRecorder";

interface Props {
  contact: Contact;
  onEdit: () => void;
  onSave: (c: Contact) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="cc-detail-field">
      <div className="cc-detail-label">{label}</div>
      <div className="cc-detail-value">{value}</div>
    </div>
  );
}

/**
 * Read-only contact view + actions (emit, save-to-phone, delete). Extracted from
 * the old ContactDetail drawer so it can render inside a routed page instead.
 * The `onEdit` callback flips the host into edit mode; the host owns the form.
 */
export default function ContactView({ contact, onEdit, onSave, onDelete }: Props) {
  const [embedded, setEmbedded] = useState(false);
  const [emitting, setEmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isEmbedded().then((v) => {
      if (!cancelled) setEmbedded(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddToOpsette = async () => {
    setEmitting(true);
    try {
      await emitContactToOpsette(contact);
      message.success("Added to your Opsette inbox for review.");
      await onSave({ ...contact, emittedAt: Date.now() });
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Couldn't add to Opsette. Try again.",
      );
    } finally {
      setEmitting(false);
    }
  };

  const handleSaveToPhone = async () => {
    const usedShare = canShareFiles();
    const ok = await shareSingleVcard(contact);
    if (!ok) return;
    if (usedShare) {
      message.success("vCard sent — choose Contacts to save it");
    } else {
      message.success("vCard downloaded — open it to add to your phone's Contacts");
    }
  };

  return (
    <div>
      {contact.tags.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {contact.tags.map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      )}
      <Field label="Name" value={contact.name} />
      <Field label="Company" value={contact.company} />
      <Field label="Position" value={contact.position} />
      <Field label="Relationship" value={contact.contactType} />
      <Field label="Email" value={contact.email} />
      <Field label="Phone" value={contact.phone} />
      <Field label="Website" value={contact.website ?? ""} />
      <Field label="Event" value={contact.eventName ?? ""} />
      <Field label="Date met" value={contact.metDate ?? ""} />
      <Field label="Where you met" value={contact.metAt} />
      <Field label="Memorable detail" value={contact.memorableDetail} />
      <Field label="Follow-up" value={contact.followUp} />

      {contact.voiceMemo && (
        <div style={{ marginTop: 16 }}>
          <VoiceMemoRecorder
            value={contact.voiceMemo}
            onChange={() => {
              /* read-only */
            }}
            readOnly
          />
        </div>
      )}

      {embedded && (
        <Button
          type="primary"
          icon={contact.emittedAt ? <CheckCircleFilled /> : <SendOutlined />}
          block
          loading={emitting}
          disabled={!!contact.emittedAt}
          style={{ marginTop: 16 }}
          onClick={handleAddToOpsette}
        >
          {contact.emittedAt ? "Added to Opsette" : "Add to Opsette"}
        </Button>
      )}

      <Button
        type={embedded ? "default" : "primary"}
        icon={<DownloadOutlined />}
        block
        style={{ marginTop: embedded ? 12 : 16 }}
        onClick={handleSaveToPhone}
      >
        Add to phone Contacts
      </Button>

      <Button
        onClick={onEdit}
        block
        style={{ marginTop: 12 }}
      >
        Edit contact
      </Button>

      <Popconfirm
        title="Delete this contact?"
        description="This cannot be undone."
        okText="Delete"
        okButtonProps={{ danger: true }}
        onConfirm={() => onDelete(contact.id)}
      >
        <Button danger icon={<DeleteOutlined />} block style={{ marginTop: 12 }}>
          Delete contact
        </Button>
      </Popconfirm>
    </div>
  );
}
