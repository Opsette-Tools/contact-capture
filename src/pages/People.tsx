import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import BottomNav from "@/components/BottomNav";
import ContactList from "@/components/ContactList";
import MyCard from "@/components/MyCard";
import type { Contact } from "@/lib/contactsDb";
import { getAllContacts } from "@/lib/storage";

/**
 * The full contacts data view — everyone you've met, searchable and filterable.
 * Tapping a contact routes to /contact/:id. Distinct from Home, which is about
 * the live capture moment, not browsing the back catalogue.
 */
export default function People() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [myCardOpen, setMyCardOpen] = useState(false);

  const refresh = useCallback(async () => {
    setContacts(await getAllContacts());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />
      <main className="cc-container">
        <h2 className="cc-page-title">
          People{contacts.length ? ` · ${contacts.length}` : ""}
        </h2>
        <ContactList
          contacts={contacts}
          onSelect={(c) => navigate(`/contact/${c.id}`)}
          onAddNew={() => navigate("/")}
          onOpenMyCard={() => setMyCardOpen(true)}
        />
      </main>

      <MyCard open={myCardOpen} onClose={() => setMyCardOpen(false)} />
      <BottomNav active="people" onChange={() => {}} />
    </div>
  );
}
