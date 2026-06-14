import { CameraOutlined, CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export type BottomNavKey = "home" | "people" | "events";

interface Props {
  active: BottomNavKey;
  /** Optional override; by default each item routes to its page. */
  onChange?: (key: BottomNavKey) => void;
}

const ITEMS: { key: BottomNavKey; label: string; path: string; icon: React.ReactNode }[] = [
  { key: "home", label: "Capture", path: "/", icon: <CameraOutlined /> },
  { key: "people", label: "People", path: "/people", icon: <TeamOutlined /> },
  { key: "events", label: "Events", path: "/events", icon: <CalendarOutlined /> },
];

export default function BottomNav({ active, onChange }: Props) {
  const navigate = useNavigate();
  return (
    <nav className="cc-bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className="cc-bottom-nav-btn"
          data-active={active === item.key}
          aria-current={active === item.key ? "page" : undefined}
          onClick={() => {
            if (onChange) onChange(item.key);
            navigate(item.path);
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
