import Tesseract from "tesseract.js";

export interface ParsedCard {
  name: string;
  company: string;
  email: string;
  phone: string;
  raw: string;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /https?:\/\/|www\./i;
const COMPANY_HINT = /\b(Inc|LLC|Ltd|Co\.?|Corp|GmbH|Group|Studio|Agency|Labs|Technologies|Solutions)\b/i;

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

export function parseCardText(raw: string): ParsedCard {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const emailMatch = raw.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0] : "";

  const phoneMatch = raw.match(PHONE_RE);
  const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, " ").trim() : "";

  const skip = (l: string) =>
    EMAIL_RE.test(l) || PHONE_RE.test(l) || URL_RE.test(l);

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
    if (l.length < 2 || l.length > 40) continue;
    name = l;
    break;
  }

  if (!company) {
    const candidates = lines.filter((l) => !skip(l) && l !== name);
    if (candidates.length > 0) company = candidates[0];
  }

  return { name, company, email, phone, raw };
}
