import { openDB, type IDBPDatabase } from "idb";

export const TAG_SUGGESTIONS = [
  "Lead",
  "Client",
  "Partner",
  "Connection",
  "Investor",
] as const;

export interface Event {
  id: string;
  name: string;
  date: string; // ISO yyyy-mm-dd, optional
  /** Free-form local time string (e.g. "6:30 PM"). Optional. */
  time: string;
  location: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceMemo {
  audioBlob: Blob;
  transcript: string;
  recordedAt: number;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  /** Job title / role — e.g. "Founder", "VP Marketing". Free-form, optional. */
  position: string;
  email: string;
  phone: string;
  website: string;
  /** Free-form, optional. Kept for backward compat & extra context (e.g. "by the bar"). */
  metAt: string;
  /** ID of linked event, if any. */
  eventId?: string;
  /** Snapshot of the event's name at link time, so deleting the event keeps context. */
  eventName?: string;
  /** Specific date this contact was met (auto-filled from event, editable). ISO yyyy-mm-dd. */
  metDate?: string;
  memorableDetail: string;
  followUp: string;
  /** Free-form tags. Replaces the older single `tag` field. */
  tags: string[];
  /** Optional voice memo with transcript, captured during/after the conversation. */
  voiceMemo?: VoiceMemo;
  createdAt: number;
  updatedAt: number;
}

/** Self-record stored under SELF_KEY in the SELF_STORE. Subset of Contact —
 * no event/met/tags/memo, just the fields you'd put on a business card. */
export interface SelfCard {
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  updatedAt: number;
}

const DB_NAME = "contact-capture";
const STORE = "contacts";
const EVENTS_STORE = "events";
const SELF_STORE = "self";
const SELF_KEY = "me";
const VERSION = 3;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(EVENTS_STORE)) {
          db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
        }
        // v3: self-card store. New contact fields (position, voiceMemo) flow
        // through the existing migrateContact() path on read — no per-row
        // rewrite needed in the upgrade transaction.
        if (oldVersion < 3 && !db.objectStoreNames.contains(SELF_STORE)) {
          db.createObjectStore(SELF_STORE);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Bring older records up to the current Contact shape.
 * - Maps the legacy single `tag` ("Hot" | "Maybe" | "Friend") to the new `tags` array.
 *   "Hot" → "Lead", "Maybe"/"Friend" → "Connection". Custom strings pass through.
 * - Defaults missing string fields to "".
 * - position / voiceMemo default to "" / undefined for pre-v3 records.
 */
function migrateContact(raw: unknown): Contact {
  const r = (raw ?? {}) as Record<string, unknown> & {
    tag?: string;
    tags?: unknown;
  };
  let tags: string[] = [];
  if (Array.isArray(r.tags)) {
    tags = r.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "");
  } else if (typeof r.tag === "string" && r.tag.trim() !== "") {
    const legacy = r.tag.trim();
    if (legacy === "Hot") tags = ["Lead"];
    else if (legacy === "Maybe" || legacy === "Friend") tags = ["Connection"];
    else tags = [legacy];
  }

  let voiceMemo: VoiceMemo | undefined;
  const vm = r.voiceMemo as Record<string, unknown> | undefined;
  if (vm && vm.audioBlob instanceof Blob) {
    voiceMemo = {
      audioBlob: vm.audioBlob,
      transcript: typeof vm.transcript === "string" ? vm.transcript : "",
      recordedAt: typeof vm.recordedAt === "number" ? vm.recordedAt : Date.now(),
    };
  }

  return {
    id: String(r.id ?? crypto.randomUUID()),
    name: String(r.name ?? ""),
    company: String(r.company ?? ""),
    position: String(r.position ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    website: String(r.website ?? ""),
    metAt: String(r.metAt ?? ""),
    eventId: typeof r.eventId === "string" ? r.eventId : undefined,
    eventName: typeof r.eventName === "string" ? r.eventName : undefined,
    metDate: typeof r.metDate === "string" ? r.metDate : undefined,
    memorableDetail: String(r.memorableDetail ?? ""),
    followUp: String(r.followUp ?? ""),
    tags,
    voiceMemo,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}

export async function getAllContacts(): Promise<Contact[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as unknown[];
  return all
    .map(migrateContact)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const db = await getDb();
  const raw = await db.get(STORE, id);
  return raw ? migrateContact(raw) : undefined;
}

export async function putContact(contact: Contact): Promise<void> {
  const db = await getDb();
  await db.put(STORE, contact);
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export function newContact(): Contact {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "",
    company: "",
    position: "",
    email: "",
    phone: "",
    website: "",
    metAt: "",
    eventId: undefined,
    eventName: undefined,
    metDate: undefined,
    memorableDetail: "",
    followUp: "",
    tags: [],
    voiceMemo: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- Events ----------

function migrateEvent(raw: unknown): Event {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? crypto.randomUUID()),
    name: String(r.name ?? ""),
    date: String(r.date ?? ""),
    time: String(r.time ?? ""),
    location: String(r.location ?? ""),
    notes: String(r.notes ?? ""),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDb();
  const all = (await db.getAll(EVENTS_STORE)) as unknown[];
  return all.map(migrateEvent).sort((a, b) => {
    // Most recent date first; events without dates fall back to updatedAt.
    const ad = a.date ? new Date(a.date).getTime() : a.updatedAt;
    const bd = b.date ? new Date(b.date).getTime() : b.updatedAt;
    return bd - ad;
  });
}

export async function getEvent(id: string): Promise<Event | undefined> {
  const db = await getDb();
  const raw = await db.get(EVENTS_STORE, id);
  return raw ? migrateEvent(raw) : undefined;
}

export async function putEvent(event: Event): Promise<void> {
  const db = await getDb();
  await db.put(EVENTS_STORE, event);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(EVENTS_STORE, id);
}

export function newEvent(): Event {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "",
    date: "",
    time: "",
    location: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export async function countContactsForEvent(eventId: string): Promise<number> {
  const all = await getAllContacts();
  return all.filter((c) => c.eventId === eventId).length;
}

/** Returns yyyy-mm-dd in the user's local time zone. */
export function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Most recently updated event whose date matches today. Returns undefined if none. */
export async function getActiveEvent(): Promise<Event | undefined> {
  const today = todayLocalIso();
  const all = await getAllEvents();
  const matches = all.filter((e) => e.date === today);
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

// ---------- Self card ----------

export function newSelfCard(): SelfCard {
  return {
    name: "",
    position: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    updatedAt: Date.now(),
  };
}

export async function getSelf(): Promise<SelfCard | undefined> {
  const db = await getDb();
  const raw = (await db.get(SELF_STORE, SELF_KEY)) as
    | Partial<SelfCard>
    | undefined;
  if (!raw) return undefined;
  return {
    name: String(raw.name ?? ""),
    position: String(raw.position ?? ""),
    company: String(raw.company ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    website: String(raw.website ?? ""),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export async function putSelf(card: SelfCard): Promise<void> {
  const db = await getDb();
  await db.put(SELF_STORE, { ...card, updatedAt: Date.now() }, SELF_KEY);
}
