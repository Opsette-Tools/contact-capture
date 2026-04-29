import type { Contact } from "./contactsDb";

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
  return s.replace(/[^a-z0-9_\-]+/gi, "_").replace(/^_+|_+$/g, "") || "contact";
}

export function exportContactsCsv(contacts: Contact[]) {
  const headers = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Event",
    "Met date",
    "Where you met",
    "Memorable detail",
    "Follow-up",
    "Tag",
    "Created",
    "Updated",
  ];
  const rows = contacts.map((c) =>
    [
      c.name,
      c.company,
      c.email,
      c.phone,
      c.eventName ?? "",
      c.metDate ?? "",
      c.metAt,
      c.memorableDetail,
      c.followUp,
      c.tag,
      new Date(c.createdAt).toISOString(),
      new Date(c.updatedAt).toISOString(),
    ]
      .map(csvEscape)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\r\n");
  // Prepend BOM so Excel detects UTF-8.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `contacts-${timestamp()}.csv`);
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
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(c.email)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${vcardEscape(c.phone)}`);

  const noteParts: string[] = [];
  if (c.eventName) noteParts.push(`Event: ${c.eventName}`);
  if (c.metDate) noteParts.push(`Met: ${c.metDate}`);
  if (c.metAt) noteParts.push(`Where: ${c.metAt}`);
  if (c.memorableDetail) noteParts.push(`Detail: ${c.memorableDetail}`);
  if (c.followUp) noteParts.push(`Follow-up: ${c.followUp}`);
  noteParts.push(`Tag: ${c.tag}`);
  lines.push(`NOTE:${vcardEscape(noteParts.join(" | "))}`);
  lines.push(`CATEGORIES:${vcardEscape(c.tag)}`);
  lines.push(`REV:${new Date(c.updatedAt).toISOString()}`);
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
