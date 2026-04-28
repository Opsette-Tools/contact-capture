import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import App from "./App.tsx";
import "./index.css";
import "./styles/global.css";
import { antTheme } from "./lib/theme";

// Guard: never register the PWA service worker inside the Lovable preview iframe.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={antTheme}>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>,
);
