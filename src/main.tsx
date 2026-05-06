import { createRoot } from "react-dom/client";
import { App as AntApp } from "antd";
import App from "./App.tsx";
import "./index.css";
import "./styles/global.css";

// ConfigProvider lives inside <App /> so it can react to theme changes from
// useTheme(). Wrapping it here would freeze the antd theme tokens at first
// render and any algorithm/surface-token swap higher up would be overridden.
createRoot(document.getElementById("root")!).render(
  <AntApp>
    <App />
  </AntApp>,
);
