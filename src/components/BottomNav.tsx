import { CalendarOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";

export type BottomNavKey = "list" | "add" | "events";

interface Props {
  active: BottomNavKey;
  onChange: (key: BottomNavKey) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="cc-bottom-nav" aria-label="Primary">
      <button
        type="button"
        className="cc-bottom-nav-btn"
        data-active={active === "list"}
        onClick={() => onChange("list")}
      >
        <TeamOutlined />
        <span>Contacts</span>
      </button>
      <button
        type="button"
        className="cc-bottom-nav-btn"
        data-primary="true"
        onClick={() => onChange("add")}
        aria-label="Add contact"
      >
        <PlusOutlined />
        <span>Add</span>
      </button>
      <button
        type="button"
        className="cc-bottom-nav-btn"
        data-active={active === "events"}
        onClick={() => onChange("events")}
      >
        <CalendarOutlined />
        <span>Events</span>
      </button>
    </nav>
  );
}
