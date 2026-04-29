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

// antd Tag preset colors. We map well-known suggested tags to specific colors,
// and hash any other (free-form) tag onto one of the remaining presets so the
// same custom tag always renders in the same color.
const KNOWN_TAG_COLORS: Record<string, string> = {
  Lead: "green",
  Client: "blue",
  Partner: "purple",
  Connection: "default",
  Investor: "gold",
};

const FALLBACK_TAG_PALETTE = [
  "magenta",
  "volcano",
  "orange",
  "lime",
  "cyan",
  "geekblue",
];

export function colorForTag(tag: string): string {
  const known = KNOWN_TAG_COLORS[tag];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return FALLBACK_TAG_PALETTE[Math.abs(hash) % FALLBACK_TAG_PALETTE.length];
}
