import type { Contact } from "./contactsDb";

/**
 * Inverse of selfToVcard / contactToVcard from exporters.ts. This is NOT a
 * general vCard 3.0 parser — only the dialect Contact Capture emits is
 * supported. Returns null when the input doesn't look like a vCard at all.
 *
 * The encoder uses vcardEscape() which escapes in this order:
 *   \\ -> \\\\,  \n -> \\n,  , -> \\,,  ; -> \\;
 * To unescape correctly we walk the string character-by-character so an
 * escaped backslash doesn't accidentally consume a following escape token.
 */
export function parseVcard(input: string): Partial<Contact> | null {
  if (typeof input !== "string") return null;
  // Strip BOM (U+FEFF) and surrounding whitespace.
  const cleaned = input.replace(/^[\uFEFF]/, "").trim();
  if (!cleaned) return null;
  if (!/^BEGIN:VCARD\b/i.test(cleaned)) return null;

  // Prefer CRLF (what the encoder emits); fall back to LF for defensive
  // parsing of payloads that may have been re-line-ended in transit.
  const lines = cleaned.includes("\r\n")
    ? cleaned.split("\r\n")
    : cleaned.split("\n");

  const out: Partial<Contact> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const rawKey = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);

    // Property params live after a `;` on the key side (e.g. EMAIL;TYPE=INTERNET).
    const semi = rawKey.indexOf(";");
    const key = (semi >= 0 ? rawKey.slice(0, semi) : rawKey).trim().toUpperCase();

    const decoded = unescapeVcard(value);

    switch (key) {
      case "FN":
        out.name = decoded;
        break;
      case "ORG":
        out.company = decoded;
        break;
      case "TITLE":
        out.position = decoded;
        break;
      case "EMAIL":
        out.email = decoded;
        break;
      case "TEL":
        out.phone = decoded;
        break;
      case "URL":
        // Strip the leading https:// the encoder adds back, so the form's
        // displayed text matches what the user originally typed.
        out.website = decoded.replace(/^https?:\/\//i, "");
        break;
      // Intentionally ignored: BEGIN, END, VERSION, REV, N, NOTE, CATEGORIES,
      // and anything else. The form draft picks up the gaps from elsewhere
      // (active-event banner, default empty strings).
      default:
        break;
    }
  }

  return out;
}

/**
 * Single-pass inverse of vcardEscape(). Walks character-by-character so that
 *   "\\,"  -> ","   (escaped comma)
 *   "\\\\" -> "\"   (escaped backslash)
 *   "\\\\,"-> "\\," (escaped backslash + escaped comma)
 * resolve correctly without one rule eating another's escape.
 */
function unescapeVcard(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\\" && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === "n" || next === "N") {
        out += "\n";
        i++;
        continue;
      }
      if (next === "," || next === ";" || next === "\\") {
        out += next;
        i++;
        continue;
      }
      // Unknown escape — pass through literally so we don't lose data.
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}
