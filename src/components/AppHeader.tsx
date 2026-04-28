import { ContactsOutlined } from "@ant-design/icons";

export default function AppHeader() {
  return (
    <header className="cc-header">
      <span className="cc-header-icon">
        <ContactsOutlined />
      </span>
      <h1 className="cc-header-title">Contact Capture</h1>
    </header>
  );
}
