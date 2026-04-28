import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Drawer, Modal, Popconfirm, Space } from "antd";
import { useState } from "react";
import type { Contact } from "@/lib/contactsDb";
import ContactForm from "./ContactForm";
import TagBadge from "./TagBadge";

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

  const handleClose = () => {
    setEditing(false);
    onClose();
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
          <div style={{ marginBottom: 16 }}>
            <TagBadge tag={contact.tag} />
          </div>
          <Field label="Name" value={contact.name} />
          <Field label="Company" value={contact.company} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone} />
          <Field label="Where you met" value={contact.metAt} />
          <Field label="Memorable detail" value={contact.memorableDetail} />
          <Field label="Follow-up" value={contact.followUp} />

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
            <Button danger icon={<DeleteOutlined />} block style={{ marginTop: 16 }}>
              Delete contact
            </Button>
          </Popconfirm>
        </div>
      )}
    </Drawer>
  );
}
