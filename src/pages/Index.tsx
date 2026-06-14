import {
  ArrowRightOutlined,
  CalendarOutlined,
  CameraOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Avatar, Button } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import BottomNav from "@/components/BottomNav";
import AddNewScreen from "@/components/AddNewScreen";
import MyCard from "@/components/MyCard";
import type { Contact, Event } from "@/lib/contactsDb";
import { getActiveEvent, getAllContacts } from "@/lib/storage";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Home — the capture-first surface. The hero is the capture action; below it,
 * today's event with the people caught tonight stacking up. Browsing the full
 * catalogue lives on /people and /events, not here. Opening the capture flow
 * swaps the home body for AddNewScreen (scan → form → saved) so capture stays
 * one tap away with no page hop.
 */
const Index = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | undefined>(undefined);
  const [capturing, setCapturing] = useState(false);
  const [myCardOpen, setMyCardOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [all, ev] = await Promise.all([getAllContacts(), getActiveEvent()]);
    setContacts(all);
    setActiveEvent(ev);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.title = "Contact Capture";
  }, []);

  // People captured today (under any event) — the "tonight" momentum list.
  const tonight = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    return contacts.filter((c) => c.createdAt >= todayMs);
  }, [contacts]);

  if (capturing) {
    return (
      <div className="cc-app">
        <OpsetteHeader rightExtra={<ThemeToggleButton />} />
        <main className="cc-container">
          <Button
            type="text"
            size="small"
            onClick={() => {
              void refresh();
              setCapturing(false);
            }}
            style={{ marginBottom: 12, paddingLeft: 0 }}
          >
            ← Done capturing
          </Button>
          <AddNewScreen
            activeEvent={activeEvent}
            onSaved={() => void refresh()}
            onShowMyCard={() => setMyCardOpen(true)}
            onViewList={() => {
              void refresh();
              setCapturing(false);
            }}
          />
        </main>
        <MyCard open={myCardOpen} onClose={() => setMyCardOpen(false)} />
      </div>
    );
  }

  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />
      <main className="cc-container">
       <div className="cc-home">
        {/* The hero: capture leads — it's the point of the app. */}
        <button
          type="button"
          className="cc-capture-hero"
          onClick={() => setCapturing(true)}
        >
          <span className="cc-capture-hero-icon">
            <CameraOutlined />
          </span>
          <span className="cc-capture-hero-label">Capture a contact</span>
          <span className="cc-capture-hero-sub">Scan a card · QR · or by hand</span>
        </button>

        {/* Today's event context — a quiet banner under the hero, not above it. */}
        {activeEvent ? (
          <button
            type="button"
            className="cc-home-event"
            onClick={() => navigate(`/event/${activeEvent.id}`)}
          >
            <div className="cc-home-event-eyebrow">
              <CalendarOutlined /> Tonight
            </div>
            <div className="cc-home-event-name">
              {activeEvent.name || "(Untitled event)"}
            </div>
            <div className="cc-home-event-tally">
              {tonight.length === 0
                ? "No one caught yet — go get the first."
                : `${tonight.length} caught tonight`}
            </div>
          </button>
        ) : (
          <div className="cc-home-event cc-home-event--empty">
            <div className="cc-home-event-eyebrow">
              <CalendarOutlined /> No event for today
            </div>
            <div className="cc-home-event-tally">
              You can still capture — or{" "}
              <a onClick={() => navigate("/events")}>set up an event</a> first.
            </div>
          </div>
        )}

        {/* Tonight's catches — momentum. */}
        {tonight.length > 0 && (
          <div className="cc-home-section">
            <div className="cc-home-section-head">Tonight's catches</div>
            <div className="cc-home-catches">
              {tonight.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="cc-home-catch"
                  onClick={() => navigate(`/contact/${c.id}`)}
                >
                  <Avatar className="cc-avatar" size={44}>
                    {c.name ? initials(c.name) : <TeamOutlined />}
                  </Avatar>
                  <div className="cc-home-catch-body">
                    <div className="cc-home-catch-name">
                      {c.name || "(No name)"}
                    </div>
                    <div className="cc-home-catch-sub">
                      {c.company || c.position || c.contactType}
                    </div>
                  </div>
                  <ArrowRightOutlined className="cc-home-catch-arrow" />
                </button>
              ))}
            </div>
          </div>
        )}
       </div>
      </main>

      <MyCard open={myCardOpen} onClose={() => setMyCardOpen(false)} />
      <BottomNav active="home" onChange={() => {}} />
    </div>
  );
};

export default Index;
