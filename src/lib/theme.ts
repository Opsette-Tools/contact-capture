import type { ThemeConfig } from "antd";

// Design tokens — keep colors here, not inline. Components should reference
// these via the antd theme or the CSS variables in styles/global.css.
export const colors = {
  primary: "#1F2937", // slate-800 — primary buttons, header icon
  accent: "#3B82F6", // blue-500 — links, active filter, focus ring
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  bgLayout: "#F8F9FB",
  bgContainer: "#FFFFFF",
  border: "#E5E7EB",
  textMuted: "#6B7280",
  avatarBg: "#1F2937",
  tagHot: "#DC2626",
  tagMaybe: "#3B82F6",
  tagFriend: "#16A34A",
} as const;

export const antTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.accent,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.danger,
    colorBgLayout: colors.bgLayout,
    colorBgContainer: colors.bgContainer,
    colorLink: colors.accent,
    colorLinkHover: "#2563EB",
    borderRadius: 10,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: colors.bgContainer, bodyBg: colors.bgLayout },
    Tabs: { itemSelectedColor: colors.primary, inkBarColor: colors.primary },
    Button: { controlHeight: 40 },
    Input: { controlHeight: 40 },
    Select: { controlHeight: 40 },
  },
};

export const tagColors: Record<string, string> = {
  Hot: "red",
  Maybe: "blue",
  Friend: "green",
};
