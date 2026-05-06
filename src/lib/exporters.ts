import type { Contact, SelfCard } from "./contactsDb";

function csvEscape(value: string | undefined): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function safeFilename(s: string) {
  return s.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "contact";
}

export function exportContactsCsv(contacts: Contact[]) {
  const csv = buildContactsCsv(contacts);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `contacts-${timestamp()}.csv`);
}

function buildContactsCsv(contacts: Contact[]): string {
  const headers = [
    "Name",
    "Company",
    "Position",
    "Email",
    "Phone",
    "Website",
    "Event",
    "Met date",
    "Where you met",
    "Memorable detail",
    "Follow-up",
    "Tags",
    "Voice memo transcript",
    "Created",
    "Updated",
  ];
  const rows = contacts.map((c) =>
    [
      c.name,
      c.company,
      c.position ?? "",
      c.email,
      c.phone,
      c.website ?? "",
      c.eventName ?? "",
      c.metDate ?? "",
      c.metAt,
      c.memorableDetail,
      c.followUp,
      c.tags.join("; "),
      c.voiceMemo?.transcript ?? "",
      new Date(c.createdAt).toISOString(),
      new Date(c.updatedAt).toISOString(),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

function vcardEscape(value: string | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function contactToVcard(c: Contact): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = c.name || "(No name)";
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.slice(-1).join(" ") : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  lines.push(`N:${vcardEscape(last)};${vcardEscape(first)};;;`);
  lines.push(`FN:${vcardEscape(name)}`);
  if (c.company) lines.push(`ORG:${vcardEscape(c.company)}`);
  // TITLE is the vCard 3.0 standard slot for job title — iOS/Android Contacts
  // both render this in the position field on the contact record.
  if (c.position) lines.push(`TITLE:${vcardEscape(c.position)}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(c.email)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(c.phone)}`);
  if (c.website) {
    const url = /^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`;
    lines.push(`URL:${vcardEscape(url)}`);
  }

  const noteParts: string[] = [];
  if (c.eventName) noteParts.push(`Event: ${c.eventName}`);
  if (c.metDate) noteParts.push(`Met: ${c.metDate}`);
  if (c.metAt) noteParts.push(`Where: ${c.metAt}`);
  if (c.memorableDetail) noteParts.push(`Detail: ${c.memorableDetail}`);
  if (c.followUp) noteParts.push(`Follow-up: ${c.followUp}`);
  if (c.tags.length > 0) noteParts.push(`Tags: ${c.tags.join(", ")}`);
  if (c.voiceMemo?.transcript) noteParts.push(`Voice: ${c.voiceMemo.transcript}`);
  lines.push(`NOTE:${vcardEscape(noteParts.join(" | "))}`);
  if (c.tags.length > 0) {
    lines.push(`CATEGORIES:${c.tags.map(vcardEscape).join(",")}`);
  }
  lines.push(`REV:${new Date(c.updatedAt).toISOString()}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** vCard for the user's own self-card. Mirrors contactToVcard but trimmed. */
export function selfToVcard(s: SelfCard): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = s.name || "(No name)";
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.slice(-1).join(" ") : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  lines.push(`N:${vcardEscape(last)};${vcardEscape(first)};;;`);
  lines.push(`FN:${vcardEscape(name)}`);
  if (s.company) lines.push(`ORG:${vcardEscape(s.company)}`);
  if (s.position) lines.push(`TITLE:${vcardEscape(s.position)}`);
  if (s.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(s.email)}`);
  if (s.phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(s.phone)}`);
  if (s.website) {
    const url = /^https?:\/\//i.test(s.website) ? s.website : `https://${s.website}`;
    lines.push(`URL:${vcardEscape(url)}`);
  }
  lines.push(`REV:${new Date(s.updatedAt).toISOString()}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function exportContactsVcard(contacts: Contact[]) {
  const body = contacts.map(contactToVcard).join("\r\n");
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  downloadBlob(blob, `contacts-${timestamp()}.vcf`);
}

/**
 * Download a single contact as a .vcf file. On iOS / Android, opening the
 * downloaded file from the Files app prompts to add it directly to Contacts.
 */
export function exportSingleVcard(contact: Contact) {
  const body = contactToVcard(contact);
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  downloadBlob(blob, `${safeFilename(contact.name || "contact")}.vcf`);
}

// ---------- Web Share API helpers ----------

/** True when the browser can share files via the system share sheet. iOS Safari
 * 15+, Android Chrome, etc. Desktop browsers usually return false. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  // Probe with a tiny dummy file — calling canShare with a non-File object
  // would throw, so we always pass a File matching what we'd actually send.
  try {
    const probe = new File(["BEGIN:VCARD\r\nEND:VCARD"], "probe.vcf", {
      type: "text/vcard",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** True if the error from navigator.share() represents the user cancelling. */
function isShareCancelled(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || /cancell?ed|abort/i.test(err.message);
}

/**
 * Share a single contact as a .vcf via the system share sheet on mobile, or
 * fall back to a download. Returns true if the action completed (shared or
 * downloaded), false if the user cancelled the share sheet.
 */
export async function shareSingleVcard(contact: Contact): Promise<boolean> {
  const body = contactToVcard(contact);
  const filename = `${safeFilename(contact.name || "contact")}.vcf`;
  if (canShareFiles()) {
    const file = new File([body], filename, { type: "text/vcard" });
    try {
      await navigator.share({
        files: [file],
        title: contact.name || "Contact",
        text: `${contact.name || "Contact"} — vCard`,
      });
      return true;
    } catch (err) {
      if (isShareCancelled(err)) return false;
      // Fall through to download on any other error (permission, browser bug).
    }
  }
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  downloadBlob(blob, filename);
  return true;
}

/** Share or download all contacts as a single multi-vCard. */
export async function shareContactsVcard(contacts: Contact[]): Promise<boolean> {
  const body = contacts.map(contactToVcard).join("\r\n");
  const filename = `contacts-${timestamp()}.vcf`;
  if (canShareFiles()) {
    const file = new File([body], filename, { type: "text/vcard" });
    try {
      await navigator.share({
        files: [file],
        title: "Contacts",
        text: `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`,
      });
      return true;
    } catch (err) {
      if (isShareCancelled(err)) return false;
    }
  }
  const blob = new Blob([body], { type: "text/vcard;charset=utf-8" });
  downloadBlob(blob, filename);
  return true;
}

/** Share or download contacts as CSV. */
export async function shareContactsCsv(contacts: Contact[]): Promise<boolean> {
  const csv = buildContactsCsv(contacts);
  const filename = `contacts-${timestamp()}.csv`;
  if (canShareFiles()) {
    const file = new File(["﻿" + csv], filename, { type: "text/csv" });
    try {
      await navigator.share({
        files: [file],
        title: "Contacts CSV",
        text: `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`,
      });
      return true;
    } catch (err) {
      if (isShareCancelled(err)) return false;
    }
  }
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  return true;
}
