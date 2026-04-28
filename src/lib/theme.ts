import type { ThemeConfig } from "antd";

export const antTheme: ThemeConfig = {
  token: {
    colorPrimary: "#F59E0B",
    colorInfo: "#F59E0B",
    colorSuccess: "#16A34A",
    colorWarning: "#F59E0B",
    colorError: "#DC2626",
    colorBgLayout: "#FAF7F2",
    colorBgContainer: "#FFFFFF",
    borderRadius: 10,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: "#FFFFFF", bodyBg: "#FAF7F2" },
    Tabs: { itemSelectedColor: "#F59E0B", inkBarColor: "#F59E0B" },
    Button: { controlHeight: 40 },
    Input: { controlHeight: 40 },
    Select: { controlHeight: 40 },
  },
};

export const tagColors: Record<string, string> = {
  Hot: "volcano",
  Maybe: "blue",
  Friend: "green",
};
