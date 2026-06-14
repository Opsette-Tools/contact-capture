import { OpsetteHeader } from "@/components/opsette-header";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import BottomNav from "@/components/BottomNav";
import EventsTab from "@/components/EventsTab";

/**
 * The events list page. EventsTab owns the list + quick-create; tapping a row
 * routes to /event/:id.
 */
export default function Events() {
  return (
    <div className="cc-app">
      <OpsetteHeader rightExtra={<ThemeToggleButton />} />
      <main className="cc-container">
        <h2 className="cc-page-title">Events</h2>
        <EventsTab />
      </main>
      <BottomNav active="events" onChange={() => {}} />
    </div>
  );
}
