/**
 * Storage facade — the single API the UI calls for contacts and events.
 *
 * ── IndexedDB is ALWAYS the source of truth ────────────────────────────────
 * Standalone, embedded-emit-only, or embedded-shared — reads and writes always
 * go to IndexedDB (`contactsDb`), and the UI only ever awaits IndexedDB. The
 * Opsette bridge is used for two things, neither of which blocks the UI:
 *
 *   1. `emit` (always, when embedded) — fire a contact at the review inbox.
 *   2. Shared-store MIRROR (best-effort, fire-and-forget) — when embedded, we
 *      also push each event to Opsette's shared store in the parent contract's
 *      shape (one `data_id` per event, each carrying a nested `contacts[]` —
 *      Path A) so a `storage_scope:'shared'` tool syncs cross-device.
 *
 * ── Why the mirror is fire-and-forget (this is load-bearing) ───────────────
 * The bridge handshake (`init`) succeeds for BOTH emit-only and shared tools —
 * the parent answers `ready` either way. But the parent only acks `save` when
 * the app entry is `storage_scope:'shared'`. So an emit-only tool that AWAITED
 * `bridge.save` would hang until the 5s timeout and throw — which froze the
 * "Create event" flow in prod. Since IndexedDB already holds the authoritative
 * copy, we never await the mirror: it succeeds for shared tools and harmlessly
 * times out (swallowed) for emit-only tools. One code path, both configs, no
 * freeze, and no need for the tool to know its own storage_scope.
 *
 * The app's working shape stays flat (`Contact[]` with an `eventId`); the
 * nested events-own-contacts shape exists ONLY on the wire (flatten on read,
 * group on mirror).
 */

import { connectBridge, type Bridge } from "@/components/opsette-bridge";
import {
  getActiveEvent as idbGetActiveEvent,
  getAllContacts as idbGetAllContacts,
  getAllEvents as idbGetAllEvents,
  getContact as idbGetContact,
  getEvent as idbGetEvent,
  putContact as idbPutContact,
  putEvent as idbPutEvent,
  deleteContact as idbDeleteContact,
  deleteEvent as idbDeleteEvent,
  type Contact,
  type Event,
} from "@/lib/contactsDb";

/** Wire shape: one event per data_id, with its contacts nested inside. */
export interface StoredEvent extends Event {
  contacts: Contact[];
}

interface StorageState {
  /** Present when embedded in Opsette (emit-capable and/or shared-storage). */
  bridge: Bridge<StoredEvent> | null;
}

let state: StorageState | null = null;
let initPromise: Promise<StorageState> | null = null;

// ── flat ↔ nested serialization ─────────────────────────────────────────────

/** Flatten the nested wire shape (events-own-contacts) back to the flat working
 *  shape (contacts with an eventId) the UI and IndexedDB use. */
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

  // IndexedDB is ALWAYS the source of truth — standalone, emit-only, or shared.
  // We never block the UI on the bridge, and never require `bridge.save` to
  // succeed: an emit-only tool (emit_enabled but not storage_scope:'shared')
  // gets no `saved` ack from the parent, so any awaited save would hang and
  // time out. Storage stays local; the bridge is used for `emit` always, and
  // for best-effort shared-store mirroring only when the parent supports it.
  if (bridge) {
    // If the parent already holds shared data for us, fold it into IndexedDB so
    // the local copy is up to date. Best-effort; safe to skip if empty.
    const incoming = bridge.init.items
      .filter((it) => it?.value && typeof it.value === "object")
      .map((it) => normalizeStoredEvent(it.data_id, it.value));
    if (incoming.length > 0) {
      const { events, contacts } = flattenStored(incoming);
      await Promise.all([
        ...events.map((e) => idbPutEvent(e)),
        ...contacts.map((c) => idbPutContact(c)),
      ]);
    }
  }

  return { bridge };
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

/** True once embedded in Opsette — emit-only OR shared (both have a bridge).
 *  Drives "Add to Opsette" button visibility. */
export async function isEmbedded(): Promise<boolean> {
  const s = await initStorage();
  return s.bridge !== null;
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

export interface BulkEmitResult {
  /** Contacts newly emitted in this run. */
  sent: Contact[];
  /** Contacts skipped because they were already emitted (had emittedAt). */
  skipped: Contact[];
  /** Per-contact failures: the contact and the error message. */
  failed: { contact: Contact; error: string }[];
}

/**
 * Emit many contacts to the Opsette inbox in one action — the "Send all from
 * this event" path. Already-emitted contacts (with an `emittedAt`) are skipped
 * so re-running doesn't create duplicate inbox items. Emits sequentially so a
 * single failure is attributed to the right contact and doesn't abort the rest.
 * Returns a summary the caller turns into a toast. Throws only if not embedded.
 */
export async function emitContactsToOpsette(
  contacts: Contact[],
): Promise<BulkEmitResult> {
  const s = await initStorage();
  if (!s.bridge) {
    throw new Error("Not embedded in Opsette — emit is unavailable.");
  }
  const result: BulkEmitResult = { sent: [], skipped: [], failed: [] };
  for (const contact of contacts) {
    if (contact.emittedAt) {
      result.skipped.push(contact);
      continue;
    }
    try {
      await emitContactToOpsette(contact);
      result.sent.push(contact);
    } catch (err) {
      result.failed.push({
        contact,
        error: err instanceof Error ? err.message : "Emit failed",
      });
    }
  }
  return result;
}

// ── best-effort shared-store mirror ──────────────────────────────────────────

/**
 * Mirror one event (with its nested contacts) to the Opsette shared store —
 * FIRE-AND-FORGET. We never await this from the UI path: a shared tool acks
 * quickly, but an emit-only tool never acks `save`, so awaiting would hang and
 * time out (the bug that froze "Create event"). IndexedDB already holds the
 * authoritative copy; this is pure best-effort cross-device sync.
 */
function mirrorEventToShared(s: StorageState, eventId: string): void {
  if (!s.bridge) return;
  void rebuildStoredEvent(eventId)
    .then((se) => {
      if (se && s.bridge) return s.bridge.save(se.id, se);
    })
    .catch(() => {
      // Emit-only tools time out here by design, and a transient parent error
      // shouldn't surface — local IndexedDB is the source of truth.
    });
}

/** Best-effort shared-store delete. Fire-and-forget, same rationale as above. */
function mirrorDeleteFromShared(s: StorageState, eventId: string): void {
  if (!s.bridge) return;
  void s.bridge.delete(eventId).catch(() => {
    // Local delete already happened; ignore parent ack failure/timeout.
  });
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
  await initStorage();
  return idbGetAllContacts();
}

export async function getAllEvents(): Promise<Event[]> {
  await initStorage();
  return idbGetAllEvents();
}

/** One contact by id — used by the routed contact page to hydrate from the URL. */
export async function getContact(id: string): Promise<Contact | undefined> {
  await initStorage();
  return idbGetContact(id);
}

/** One event by id — used by the routed event page to hydrate from the URL. */
export async function getEvent(id: string): Promise<Event | undefined> {
  await initStorage();
  return idbGetEvent(id);
}

export async function saveContact(contact: Contact): Promise<void> {
  const s = await initStorage();
  // IndexedDB is the source of truth — await this so the UI reflects the save.
  await idbPutContact(contact);
  // Mirror to the Opsette shared store best-effort, never blocking the UI.
  if (contact.eventId) mirrorEventToShared(s, contact.eventId);
}

export async function deleteContact(id: string): Promise<void> {
  const s = await initStorage();
  // Capture the contact's event before deleting so we can re-mirror it.
  const eventId = (await idbGetAllContacts()).find((c) => c.id === id)?.eventId;
  await idbDeleteContact(id);
  // The event still exists with one fewer contact — re-mirror its new state.
  if (eventId) mirrorEventToShared(s, eventId);
}

export async function saveEvent(event: Event): Promise<void> {
  const s = await initStorage();
  await idbPutEvent(event);
  mirrorEventToShared(s, event.id);
}

export async function deleteEvent(id: string): Promise<void> {
  const s = await initStorage();
  await idbDeleteEvent(id);
  mirrorDeleteFromShared(s, id);
}

export async function countContactsForEvent(eventId: string): Promise<number> {
  const all = await getAllContacts();
  return all.filter((c) => c.eventId === eventId).length;
}

/** All contacts linked to an event, newest first (inherits getAllContacts sort). */
export async function getContactsForEvent(eventId: string): Promise<Contact[]> {
  const all = await getAllContacts();
  return all.filter((c) => c.eventId === eventId);
}

/**
 * Today's active event, if one exists — used only to drive the contacts-list
 * banner. Returns undefined when the user hasn't created an event for today
 * yet. We intentionally do NOT auto-create one: events are created on demand
 * (via the quick modal on the contact form), so the app never litters empty
 * dated events just for being opened.
 */
export async function getActiveEvent(): Promise<Event | undefined> {
  await initStorage();
  return idbGetActiveEvent();
}
