import { ContactsOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ShareAppButton } from "./opsette-share";

export default function AppHeader() {
  const navigate = useNavigate();
  return (
    <header className="cc-header">
      <div className="cc-header-inner">
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <span className="cc-header-icon">
            <ContactsOutlined />
          </span>
          <h1 className="cc-header-title">Contact Capture</h1>
        </button>
        <div className="cc-header-actions">
          <ShareAppButton />
        </div>
      </div>
    </header>
  );
}
