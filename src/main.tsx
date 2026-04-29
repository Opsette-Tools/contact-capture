import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import App from "./App.tsx";
import "./index.css";
import "./styles/global.css";
import { antTheme } from "./lib/theme";

createRoot(document.getElementById("root")!).render(
  <ConfigProvider theme={antTheme}>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>,
);
