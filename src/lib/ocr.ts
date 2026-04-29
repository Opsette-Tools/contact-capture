import Tesseract from "tesseract.js";

export interface ParsedCard {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  raw: string;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const PHONE_RE = /(\(?\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /https?:\/\/|www\.|\.(com|io|co|net|org|app|dev|ai)\b/i;
const WEBSITE_RE = /(?:https?:\/\/)?(?:www\.)?([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*\.(?:com|io|co|net|org|app|dev|ai|us|biz)(?:\/[^\s]*)?)/i;
const SOCIAL_DOMAINS_RE = /^(?:https?:\/\/)?(?:www\.)?(facebook|instagram|linkedin|twitter|tiktok)\.com\b/i;
const SOCIAL_HANDLE_RE = /^@[\w.]+$/;
const COMPANY_HINT = /\b(Inc|LLC|Ltd|Co\.?|Corp|GmbH|Group|Studio|Agency|Labs|Technologies|Solutions|Consulting)\b/i;
const TAGLINE_HINT = /\b(software|services|solutions for|for small|for your|specializing|helping|we (build|make|help))\b/i;
const ROLE_HINT = /\b(founder|owner|ceo|cto|cfo|coo|president|vp|vice president|director|manager|stylist|consultant|engineer|designer|developer|partner|principal|head of|lead)\b/i;

const COMMON_TLDS = new Set([
  "com", "io", "co", "net", "org", "app", "dev", "ai", "us", "biz",
]);

export async function runOcr(
  file: File | Blob,
  onProgress?: (p: number) => void,
): Promise<ParsedCard> {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round((m.progress ?? 0) * 100));
      }
    },
  });
  const raw = result.data.text || "";
  return parseCardText(raw);
}

function isNoiseLine(line: string): boolean {
  if (line.length < 2) return true;
  const total = line.length;
  const alnum = (line.match(/[A-Za-z0-9]/g) ?? []).length;
  const letters = (line.match(/[A-Za-z]/g) ?? []).length;
  if (alnum / total < 0.6) return true;
  if (letters < 3) return true;
  if (/[©®™§¢£¥€¶†‡•◊♦♣♠♥]/.test(line)) return true;
  const words = line.split(/\s+/).filter((w) => w.length > 0);
  const hasRealWord = words.some((w) => /^[A-Za-z][A-Za-z'’-]{2,}$/.test(w));
  if (!hasRealWord) return true;
  return false;
}

function looksLikeName(line: string): boolean {
  if (line.length < 3 || line.length > 40) return false;
  const words = line.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;
  let titleWords = 0;
  for (const w of words) {
    if (/^[A-Z][a-z'’-]{1,}$/.test(w)) titleWords++;
  }
  if (titleWords >= 1 && titleWords >= words.length - 1) return true;
  return false;
}

function deriveCompanyFromEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return "";
  const domain = email.slice(at + 1);
  const parts = domain.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  let core = parts[0];
  if (parts.length >= 2 && COMMON_TLDS.has(parts[parts.length - 1].toLowerCase())) {
    core = parts.slice(0, -1).join(" ");
  }
  if (!core) return "";
  return core
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseCardText(raw: string): ParsedCard {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const emailMatch = raw.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = raw.match(PHONE_RE);
  const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, " ").trim() : "";

  let website = "";
  for (const l of lines) {
    if (EMAIL_RE.test(l)) continue;
    if (SOCIAL_DOMAINS_RE.test(l)) continue;
    const m = l.match(WEBSITE_RE);
    if (m) {
      website = m[1].toLowerCase().replace(/[.,;]+$/, "");
      break;
    }
  }

  const skip = (l: string) =>
    EMAIL_RE.test(l) ||
    PHONE_RE.test(l) ||
    URL_RE.test(l) ||
    SOCIAL_DOMAINS_RE.test(l) ||
    SOCIAL_HANDLE_RE.test(l) ||
    isNoiseLine(l) ||
    TAGLINE_HINT.test(l) ||
    ROLE_HINT.test(l);

  let company = "";
  for (const l of lines) {
    if (skip(l)) continue;
    if (COMPANY_HINT.test(l)) {
      company = l;
      break;
    }
    if (l.length >= 3 && l === l.toUpperCase() && /[A-Z]/.test(l)) {
      company = l;
      break;
    }
  }

  let name = "";
  for (const l of lines) {
    if (skip(l)) continue;
    if (l === company) continue;
    if (!looksLikeName(l)) continue;
    name = l;
    break;
  }

  if (!company && email) {
    company = deriveCompanyFromEmail(email);
  }

  return { name, company, email, phone, website, raw };
}
