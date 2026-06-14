import { theme as antdTheme, type ThemeConfig } from "antd";

// Brand tokens that should apply in BOTH light and dark mode. Surface/bg
// tokens are intentionally omitted — those flow from antd's algorithm
// (defaultAlgorithm vs darkAlgorithm) so a hard-coded light surface can't
// leak through in dark mode.
const brandTokens = {
  colorPrimary: "#1F2937",
  colorInfo: "#3B82F6",
  colorSuccess: "#16A34A",
  colorWarning: "#F59E0B",
  colorError: "#DC2626",
  colorLink: "#3B82F6",
  colorLinkHover: "#2563EB",
  borderRadius: 10,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export function buildAntTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      ...brandTokens,
      // In dark mode, pin the surface tokens to the canonical palette
      // (page #000, surface #141414, border #303030) so antd-rendered
      // surfaces match the rest of the app's CSS-variable surfaces.
      ...(isDark
        ? {
            colorBgLayout: "#000000",
            colorBgContainer: "#141414",
            colorBorder: "#303030",
            colorBorderSecondary: "#1f1f1f",
          }
        : {
            colorBgLayout: "#F8F9FB",
            colorBgContainer: "#FFFFFF",
          }),
    },
    components: {
      Tabs: {
        itemSelectedColor: isDark ? "#fafafa" : "#1F2937",
        inkBarColor: isDark ? "#fafafa" : "#1F2937",
      },
      Button: { controlHeight: 40 },
      Input: { controlHeight: 40 },
      Select: { controlHeight: 40 },
    },
  };
}

// antd Tag preset colors. We map well-known suggested CONTEXT tags to specific
// colors, and hash any other (free-form) tag onto one of the remaining presets
// so the same custom tag always renders in the same color. (Tags are context,
// not relationship — Relationship has its own field. Re-scoped 2026-06-14.)
const KNOWN_TAG_COLORS: Record<string, string> = {
  Hot: "volcano",
  "Follow up": "blue",
  "Met at booth": "cyan",
  Referral: "green",
  "Investor intro": "gold",
  "Keep warm": "orange",
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
