import type { Contact } from "./contactsDb";

/**
 * Decodes an Opsette **Digital Card** share URL into a partial Contact so the
 * scanner can file the person natively — no OCR, no browser hop. This is the
 * sibling of parseVcard(): same contract (Partial<Contact> | null), same
 * "return null on anything that isn't ours" discipline so genuine garbage
 * still trips the scanner's error branch.
 *
 * A Digital Card URL looks like:
 *   https://tools.opsette.io/digital-card/#/?data=<base64>
 * The base64 is a UTF-8 JSON blob of Digital Card's CardData (photo stripped
 * to keep the QR small). We match on the presence of `data=` in the hash, NOT
 * on an exact host — the host differs between local dev and production.
 *
 * The decode mirrors digital-card/src/lib/share.ts:decodeCardFromHash:
 *   decodeURIComponent(escape(atob(payload)))  -> JSON.parse
 * (escape/unescape is the standard btoa UTF-8 round-trip the encoder uses.)
 */

/** The subset of Digital Card's CardData we read. Everything is optional
 *  because a card may omit any field, and we never trust the shape blindly. */
interface DigitalCardPayload {
  fullName?: string;
  title?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export function parseDigitalCardUrl(input: string): Partial<Contact> | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim();
  if (!cleaned) return null;

  // Must contain a data= payload somewhere in the hash. We don't require a
  // valid URL parse first — some QR encoders drop the scheme, and we only
  // care about the payload. `data=` in a query/hash is our signal.
  const match = cleaned.match(/[?&#]data=([^&\s]+)/);
  if (!match) return null;

  let payload: unknown;
  try {
    // decodeURIComponent guards against a payload that was percent-encoded in
    // transit; if it wasn't, it's a harmless no-op for base64's charset.
    const b64 = decodeURIComponent(match[1]);
    const json = decodeURIComponent(escape(atob(b64)));
    payload = JSON.parse(json);
  } catch {
    // Not our payload (bad base64 / not JSON) — let the caller show the
    // generic "not our QR" error.
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const card = payload as DigitalCardPayload;

  // A real Digital Card always carries at least a name. If none of the core
  // identity fields are present, treat it as not-a-card rather than filing an
  // empty contact.
  const hasSignal =
    !!card.fullName || !!card.email || !!card.phone || !!card.businessName;
  if (!hasSignal) return null;

  const out: Partial<Contact> = {};
  if (card.fullName) out.name = String(card.fullName);
  if (card.title) out.position = String(card.title);
  if (card.businessName) out.company = String(card.businessName);
  if (card.phone) out.phone = String(card.phone);
  if (card.email) out.email = String(card.email);
  if (card.website) {
    // Match parseVcard's convention: store bare domain, strip the scheme the
    // form re-adds on display/export.
    out.website = String(card.website).replace(/^https?:\/\//i, "");
  }

  return out;
}
