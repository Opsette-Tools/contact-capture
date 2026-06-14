import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Skeleton } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import ContactForm from "@/components/ContactForm";
import ContactView from "@/components/ContactView";
import EmptyState from "@/components/EmptyState";
import { UserOutlined } from "@ant-design/icons";
import type { Contact } from "@/lib/contactsDb";
import { deleteContact, getContact, saveContact } from "@/lib/storage";

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setContact((await getContact(id)) ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (c: Contact) => {
    setSaving(true);
    try {
      await saveContact(c);
      setContact(c);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cid: string) => {
    await deleteContact(cid);
    navigate(-1);
  };

  // Back goes to wherever you came from (event page, people list, home).
  const goBack = () => navigate(-1);

  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />
      <main className="cc-container">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={goBack}
          style={{ marginBottom: 16, paddingLeft: 0 }}
        >
          Back
        </Button>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : !contact ? (
          <EmptyState
            icon={<UserOutlined />}
            title="Contact not found"
            description="This contact may have been deleted."
            action={<Button onClick={() => navigate("/")}>Go home</Button>}
          />
        ) : editing ? (
          <>
            <h2 className="cc-page-title">Edit contact</h2>
            <ContactForm
              initial={contact}
              submitLabel="Save changes"
              saving={saving}
              onCancel={() => setEditing(false)}
              onSubmit={handleSave}
            />
          </>
        ) : (
          <>
            <h2 className="cc-page-title">{contact.name || "Contact"}</h2>
            <ContactView
              contact={contact}
              onEdit={() => setEditing(true)}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </>
        )}
      </main>
    </div>
  );
}
