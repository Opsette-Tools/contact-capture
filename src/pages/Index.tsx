import { Tabs } from "antd";
import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ContactList from "@/components/ContactList";
import ContactDetail from "@/components/ContactDetail";
import AddNewScreen from "@/components/AddNewScreen";
import EventsTab from "@/components/EventsTab";
import {
  deleteContact,
  getAllContacts,
  putContact,
  type Contact,
} from "@/lib/contactsDb";

const Index = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<string>("list");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const refresh = useCallback(async () => {
    const all = await getAllContacts();
    setContacts(all);
    if (selected) {
      const updated = all.find((c) => c.id === selected.id) ?? null;
      setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = "Contact Capture";
  }, []);

  const handleSelect = (c: Contact) => {
    setSelected(c);
    setDetailOpen(true);
  };

  const handleSave = async (c: Contact) => {
    await putContact(c);
    await refresh();
    setSelected(c);
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setSelected(null);
    setDetailOpen(false);
    await refresh();
  };

  return (
    <div className="cc-app">
      <AppHeader />
      <main className="cc-container">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "list",
              label: `All Contacts${contacts.length ? ` (${contacts.length})` : ""}`,
              children: (
                <ContactList
                  contacts={contacts}
                  onSelect={handleSelect}
                  onAddNew={() => setTab("add")}
                />
              ),
            },
            {
              key: "add",
              label: "Add New",
              children: (
                <AddNewScreen
                  onSaved={() => void refresh()}
                  onViewList={() => setTab("list")}
                />
              ),
            },
            {
              key: "events",
              label: "Events",
              children: <EventsTab />,
            },
          ]}
        />
      </main>

      <ContactDetail
        open={detailOpen}
        contact={selected}
        onClose={() => setDetailOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Index;
