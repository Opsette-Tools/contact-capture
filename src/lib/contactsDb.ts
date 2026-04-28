import { openDB, type IDBPDatabase } from "idb";

export type ContactTag = "Hot" | "Maybe" | "Friend";

export interface Event {
  id: string;
  name: string;
  date: string; // ISO yyyy-mm-dd, optional
  location: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
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
  tag: ContactTag;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "contact-capture";
const STORE = "contacts";
const EVENTS_STORE = "events";
const VERSION = 2;

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
      },
    });
  }
  return dbPromise;
}

export async function getAllContacts(): Promise<Contact[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE)) as Contact[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const db = await getDb();
  return (await db.get(STORE, id)) as Contact | undefined;
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
    email: "",
    phone: "",
    metAt: "",
    eventId: undefined,
    eventName: undefined,
    metDate: undefined,
    memorableDetail: "",
    followUp: "",
    tag: "Maybe",
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- Events ----------

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDb();
  const all = (await db.getAll(EVENTS_STORE)) as Event[];
  return all.sort((a, b) => {
    // Most recent date first; events without dates fall back to updatedAt.
    const ad = a.date ? new Date(a.date).getTime() : a.updatedAt;
    const bd = b.date ? new Date(b.date).getTime() : b.updatedAt;
    return bd - ad;
  });
}

export async function getEvent(id: string): Promise<Event | undefined> {
  const db = await getDb();
  return (await db.get(EVENTS_STORE, id)) as Event | undefined;
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
