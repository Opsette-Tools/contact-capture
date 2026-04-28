import { openDB, type IDBPDatabase } from "idb";

export type ContactTag = "Hot" | "Maybe" | "Friend";

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  metAt: string;
  memorableDetail: string;
  followUp: string;
  tag: ContactTag;
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "contact-capture";
const STORE = "contacts";
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
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
    memorableDetail: "",
    followUp: "",
    tag: "Maybe",
    createdAt: now,
    updatedAt: now,
  };
}
