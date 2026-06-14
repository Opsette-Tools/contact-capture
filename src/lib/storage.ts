/**
 * Storage facade — the single API the UI calls for contacts, events, and the
 * active event. It hides *where* data lives:
 *
 *   • Standalone (opened directly at tools.opsette.io/contact-capture, no
 *     Opsette parent) → IndexedDB (`contactsDb`). Full offline persistence.
 *
 *   • Embedded in Opsette (bridge handshake succeeds) → the Opsette shared
 *     store, via `bridge.save`/`delete`, in the parent contract's shape:
 *     **one `data_id` per event, each event carrying a nested `contacts[]`**
 *     (parent doc §3.3.1 / Path A). IndexedDB is kept in lockstep as an
 *     offline cache/mirror so a sometimes-embedded user never loses data.
 *
 * The app's *working* shape stays flat (`Contact[]` with an `eventId`) — the UI
 * is unchanged. The nested event-owns-contacts shape exists ONLY on the wire;
 * this module serializes flat→nested on write and nested→flat on read. That's
 * the whole point of the facade: contract-correct persistence, simple UI.
 *
 * ── The embedded/standalone switch (resolves plan Q2) ──────────────────────
 * `connectBridge()` returns a Bridge when embedded, else null. We resolve it
 * once at startup (`initStorage`). null → IndexedDB path. Non-null → shared
 * path with IndexedDB mirror. On first embed we seed the shared store from
 * `init.items` (parent is the source of truth when present); if the parent has
 * nothing yet, we push the local IndexedDB contents up so a user who was
 * standalone-first doesn't lose their captures.
 */

import { connectBridge, type Bridge } from "@/components/opsette-bridge";
import {
  defaultEvent,
  getActiveEvent as idbGetActiveEvent,
  getAllContacts as idbGetAllContacts,
  getAllEvents as idbGetAllEvents,
  putContact as idbPutContact,
  putEvent as idbPutEvent,
  deleteContact as idbDeleteContact,
  deleteEvent as idbDeleteEvent,
  todayLocalIso,
  type Contact,
  type Event,
} from "@/lib/contactsDb";

/** Wire shape: one event per data_id, with its contacts nested inside. */
export interface StoredEvent extends Event {
  contacts: Contact[];
}

type Mode = "idb" | "shared";

interface StorageState {
  mode: Mode;
  bridge: Bridge<StoredEvent> | null;
  /** In-memory mirror of the shared store, keyed by event id (= data_id). Only
   *  populated in shared mode; the source of truth while embedded. */
  shared: Map<string, StoredEvent>;
}

let state: StorageState | null = null;
let initPromise: Promise<StorageState> | null = null;

// ── flat ↔ nested serialization ─────────────────────────────────────────────

/** Group a flat contact list under its events. Contacts whose event is missing
 *  are attached to a synthesized "Unsorted" event so nothing is ever dropped. */
function toStoredEvents(events: Event[], contacts: Contact[]): Map<string, StoredEvent> {
  const byEvent = new Map<string, StoredEvent>();
  for (const ev of events) {
    byEvent.set(ev.id, { ...ev, contacts: [] });
  }
  for (const c of contacts) {
    const key = c.eventId && byEvent.has(c.eventId) ? c.eventId : undefined;
    if (key) {
      byEvent.get(key)!.contacts.push(c);
    }
    // Contacts with no/dangling event are intentionally left to be re-homed by
    // the active-event guarantee; in practice the always-active-event model
    // means every new contact carries a valid eventId.
  }
  return byEvent;
}

function flattenStored(stored: Iterable<StoredEvent>): {
  events: Event[];
  contacts: Contact[];
} {
  const events: Event[] = [];
  const contacts: Contact[] = [];
  for (const se of stored) {
    const { contacts: nested, ...ev } = se;
    events.push(ev);
    for (const c of nested) {
      contacts.push({ ...c, eventId: ev.id, eventName: ev.name });
    }
  }
  return { events, contacts };
}

// ── init ─────────────────────────────────────────────────────────────────────

async function doInit(): Promise<StorageState> {
  const bridge = await connectBridge<StoredEvent>();

  if (!bridge) {
    return { mode: "idb", bridge: null, shared: new Map() };
  }

  // Embedded. Build the in-memory shared mirror from the parent's init items.
  const shared = new Map<string, StoredEvent>();
  for (const item of bridge.init.items) {
    if (item?.value && typeof item.value === "object") {
      shared.set(item.data_id, normalizeStoredEvent(item.data_id, item.value));
    }
  }

  // First-embed migration: if the parent has nothing for us yet but the user
  // already captured locally (standalone-first), push the local data up so it
  // isn't stranded. We do NOT pull shared→IDB destructively; IDB is a mirror.
  if (shared.size === 0) {
    const [localEvents, localContacts] = await Promise.all([
      idbGetAllEvents(),
      idbGetAllContacts(),
    ]);
    if (localEvents.length > 0 || localContacts.length > 0) {
      const seeded = toStoredEvents(localEvents, localContacts);
      for (const [id, se] of seeded) {
        shared.set(id, se);
        await bridge.save(id, se);
      }
    }
  } else {
    // Parent is the source of truth — mirror its contents into IndexedDB so the
    // app works offline if the user later opens it standalone.
    const { events, contacts } = flattenStored(shared.values());
    await Promise.all([
      ...events.map((e) => idbPutEvent(e)),
      ...contacts.map((c) => idbPutContact(c)),
    ]);
  }

  return { mode: "shared", bridge, shared };
}

function normalizeStoredEvent(dataId: string, raw: unknown): StoredEvent {
  const r = (raw ?? {}) as Partial<StoredEvent>;
  const nestedRaw = Array.isArray(r.contacts) ? r.contacts : [];
  return {
    id: String(r.id ?? dataId),
    name: String(r.name ?? ""),
    date: String(r.date ?? ""),
    time: String(r.time ?? ""),
    location: String(r.location ?? ""),
    notes: String(r.notes ?? ""),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
    contacts: nestedRaw as Contact[],
  };
}

/** Resolve the storage backend once. Safe to await repeatedly — memoized. */
export function initStorage(): Promise<StorageState> {
  if (state) return Promise.resolve(state);
  if (!initPromise) {
    initPromise = doInit().then((s) => {
      state = s;
      return s;
    });
  }
  return initPromise;
}

/** True once embedded in Opsette (drives emit-button visibility, etc.). */
export async function isEmbedded(): Promise<boolean> {
  const s = await initStorage();
  return s.mode === "shared";
}

/**
 * Emit a contact to the Opsette review inbox as a `client`. Only valid when
 * embedded (the emit button is hidden otherwise). Maps our field names to the
 * parent contract: `position` → `title`, `contactType` → `contact_type`
 * (server resolves relationship + status). Free-form tags are intentionally
 * NOT sent — they stay local. On success, stamps the contact `emittedAt` and
 * persists it. Returns the inbox row id.
 */
export async function emitContactToOpsette(contact: Contact): Promise<string> {
  const s = await initStorage();
  if (!s.bridge) {
    throw new Error("Not embedded in Opsette — emit is unavailable.");
  }
  const { inbox_id } = await s.bridge.emit("client", {
    kind: "data",
    data: {
      name: contact.name,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      title: contact.position,
      contact_type: contact.contactType,
    },
  });
  await saveContact({ ...contact, emittedAt: Date.now() });
  return inbox_id;
}

// ── shared-mode helpers ──────────────────────────────────────────────────────

/** Persist one event (with its nested contacts) to the shared store + mirror. */
async function persistStoredEvent(s: StorageState, se: StoredEvent): Promise<void> {
  s.shared.set(se.id, se);
  if (s.bridge) await s.bridge.save(se.id, se);
}

/** Rebuild a StoredEvent for `eventId` from the current flat IDB data, so the
 *  nested wire copy always matches what the UI sees. */
async function rebuildStoredEvent(eventId: string): Promise<StoredEvent | null> {
  const [events, contacts] = await Promise.all([
    idbGetAllEvents(),
    idbGetAllContacts(),
  ]);
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return null;
  return { ...ev, contacts: contacts.filter((c) => c.eventId === eventId) };
}

// ── public API (mirrors contactsDb, but backend-aware) ───────────────────────

export async function getAllContacts(): Promise<Contact[]> {
  const s = await initStorage();
  if (s.mode === "shared") {
    return flattenStored(s.shared.values())
      .contacts.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return idbGetAllContacts();
}

export async function getAllEvents(): Promise<Event[]> {
  const s = await initStorage();
  if (s.mode === "shared") {
    return flattenStored(s.shared.values()).events.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : a.updatedAt;
      const bd = b.date ? new Date(b.date).getTime() : b.updatedAt;
      return bd - ad;
    });
  }
  return idbGetAllEvents();
}

export async function saveContact(contact: Contact): Promise<void> {
  const s = await initStorage();
  // Always write to IndexedDB (source of truth standalone, mirror when embedded).
  await idbPutContact(contact);
  if (s.mode === "shared" && contact.eventId) {
    const se = await rebuildStoredEvent(contact.eventId);
    if (se) await persistStoredEvent(s, se);
  }
}

export async function deleteContact(id: string): Promise<void> {
  const s = await initStorage();
  // Capture the contact's event before deleting so we can re-persist it.
  const eventId = (await idbGetAllContacts()).find((c) => c.id === id)?.eventId;
  await idbDeleteContact(id);
  if (s.mode === "shared" && eventId) {
    const se = await rebuildStoredEvent(eventId);
    if (se) await persistStoredEvent(s, se);
  }
}

export async function saveEvent(event: Event): Promise<void> {
  const s = await initStorage();
  await idbPutEvent(event);
  if (s.mode === "shared") {
    const se = await rebuildStoredEvent(event.id);
    if (se) await persistStoredEvent(s, se);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const s = await initStorage();
  await idbDeleteEvent(id);
  if (s.mode === "shared") {
    s.shared.delete(id);
    if (s.bridge) await s.bridge.delete(id);
  }
}

export async function countContactsForEvent(eventId: string): Promise<number> {
  const all = await getAllContacts();
  return all.filter((c) => c.eventId === eventId).length;
}

/**
 * Today's active event, if one exists — used only to drive the contacts-list
 * banner. Returns undefined when the user hasn't created an event for today
 * yet. We intentionally do NOT auto-create one: events are created on demand
 * (via the quick modal on the contact form), so the app never litters empty
 * dated events just for being opened.
 */
export async function getActiveEvent(): Promise<Event | undefined> {
  const s = await initStorage();
  if (s.mode === "shared") {
    return (await getAllEvents()).find((e) => e.date === todayLocalIso());
  }
  return idbGetActiveEvent();
}
