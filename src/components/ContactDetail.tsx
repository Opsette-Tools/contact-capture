import {
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Popconfirm, Space, message } from "antd";
import { useEffect, useState } from "react";
import type { Contact } from "@/lib/contactsDb";
import { canShareFiles, shareSingleVcard } from "@/lib/exporters";
import { emitContactToOpsette, isEmbedded } from "@/lib/storage";
import ContactForm from "./ContactForm";
import TagBadge from "./TagBadge";
import VoiceMemoRecorder from "./VoiceMemoRecorder";

interface Props {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
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

export default function ContactDetail({ open, contact, onClose, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Whether the tool is embedded in Opsette — gates the "Add to Opsette" button.
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

  const handleClose = () => {
    setEditing(false);
    onClose();
  };

  const handleAddToOpsette = async (c: Contact) => {
    setEmitting(true);
    try {
      await emitContactToOpsette(c);
      message.success("Added to your Opsette inbox for review.");
      // Reflect the emittedAt stamp in the UI via the parent's refresh path.
      await onSave({ ...c, emittedAt: Date.now() });
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Couldn't add to Opsette. Try again.",
      );
    } finally {
      setEmitting(false);
    }
  };

  const handleSaveToPhone = async (c: Contact) => {
    const usedShare = canShareFiles();
    const ok = await shareSingleVcard(c);
    if (!ok) return; // user cancelled the share sheet — stay quiet
    if (usedShare) {
      message.success("vCard sent — choose Contacts to save it");
    } else {
      message.success("vCard downloaded — open it to add to your phone's Contacts");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      placement="right"
      width="100%"
      title={contact ? (editing ? "Edit contact" : contact.name || "Contact") : ""}
      extra={
        contact && !editing ? (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </Space>
        ) : null
      }
      styles={{ body: { maxWidth: 560, margin: "0 auto", width: "100%" } }}
    >
      {!contact ? null : editing ? (
        <ContactForm
          initial={contact}
          submitLabel="Save changes"
          saving={saving}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            setSaving(true);
            try {
              await onSave(values);
              setEditing(false);
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : (
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
                  /* read-only — no edits from detail view */
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
              onClick={() => handleAddToOpsette(contact)}
            >
              {contact.emittedAt ? "Added to Opsette" : "Add to Opsette"}
            </Button>
          )}

          <Button
            type={embedded ? "default" : "primary"}
            icon={<DownloadOutlined />}
            block
            style={{ marginTop: embedded ? 12 : 16 }}
            onClick={() => handleSaveToPhone(contact)}
          >
            Add to phone Contacts
          </Button>

          <Popconfirm
            title="Delete this contact?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              await onDelete(contact.id);
              handleClose();
            }}
          >
            <Button danger icon={<DeleteOutlined />} block style={{ marginTop: 12 }}>
              Delete contact
            </Button>
          </Popconfirm>
        </div>
      )}
    </Drawer>
  );
}
