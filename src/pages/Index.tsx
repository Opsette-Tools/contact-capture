import { Drawer, Grid, Tabs } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav, { type BottomNavKey } from "@/components/BottomNav";
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<BottomNavKey>("list");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  const handleNavChange = (key: BottomNavKey) => {
    if (key === "add") {
      setAddOpen(true);
      return;
    }
    setTab(key);
  };

  const listView = (
    <ContactList
      contacts={contacts}
      onSelect={handleSelect}
      onAddNew={() => (isMobile ? setAddOpen(true) : setTab("add"))}
    />
  );

  const eventsView = <EventsTab />;

  const addView = (
    <AddNewScreen
      onSaved={() => void refresh()}
      onViewList={() => {
        if (isMobile) {
          setAddOpen(false);
          setTab("list");
        } else {
          setTab("list");
        }
      }}
    />
  );

  return (
    <div className="cc-app">
      <AppHeader />
      <main className="cc-container">
        {isMobile ? (
          tab === "list" ? listView : eventsView
        ) : (
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as BottomNavKey)}
            items={[
              {
                key: "list",
                label: `All Contacts${contacts.length ? ` (${contacts.length})` : ""}`,
                children: listView,
              },
              { key: "add", label: "Add New", children: addView },
              { key: "events", label: "Events", children: eventsView },
            ]}
          />
        )}
      </main>

      <footer className="cc-footer">
        <button onClick={() => navigate("/about")}>About</button>
        <span style={{ margin: "0 8px", color: "#cbd5e1" }}>·</span>
        <button onClick={() => navigate("/privacy")}>Privacy</button>
        <span style={{ margin: "0 8px", color: "#cbd5e1" }}>·</span>
        <span>
          By{" "}
          <a href="https://opsette.io" target="_blank" rel="noopener noreferrer">
            Opsette
          </a>
        </span>
      </footer>

      {isMobile && <BottomNav active={tab} onChange={handleNavChange} />}

      <ContactDetail
        open={detailOpen}
        contact={selected}
        onClose={() => setDetailOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Mobile-only: Add flow as a full-screen modal triggered from the center nav button. */}
      {isMobile && (
        <Drawer
          open={addOpen}
          onClose={() => setAddOpen(false)}
          placement="bottom"
          height="100%"
          title="Add contact"
          styles={{ body: { padding: 16 } }}
        >
          <AddNewScreen
            onSaved={() => void refresh()}
            onViewList={() => {
              setAddOpen(false);
              setTab("list");
            }}
          />
        </Drawer>
      )}
    </div>
  );
};

export default Index;
