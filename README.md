# Contact Capture

A small, offline-first PWA for capturing people you meet — at conferences, networking events, or anywhere a business card changes hands. Snap a photo, edit what you need, and the contact's saved on your device. No account, no cloud.

Part of the [Opsette](https://opsette.io) family of free tools.

Live: <https://tools.opsette.io/contact-capture/>

---

## Features

- **Card scan** — take or upload a photo of a business card; OCR runs on-device via [tesseract.js](https://github.com/naptha/tesseract.js) and pre-fills the name / company / email / phone fields. Always editable.
- **Manual entry** — skip the scan and type contacts in directly.
- **Events (optional)** — group contacts by event. The contact form keeps the event picker hidden behind a "+ Link to event" link so it stays out of the way when you don't need it.
- **Tags** — Hot / Maybe / Friend, with filter chips on the contact list.
- **Save to phone** — every contact has a *Save to phone* button that downloads a single-contact `.vcf` file. Open it on iOS or Android to add the contact straight to your address book.
- **Bulk export** — CSV (for spreadsheets / CRMs) and a multi-vCard `.vcf` for the whole collection.
- **Offline-first** — installable as a PWA; everything is stored in IndexedDB. Nothing is sent to any server.
- **Mobile bottom nav, desktop top tabs** — same screens, layout adapts to the breakpoint.

## Stack

- Vite + React + TypeScript
- [Ant Design](https://ant.design/) for the UI primitives
- [`idb`](https://github.com/jakearchibald/idb) for IndexedDB storage
- [`tesseract.js`](https://github.com/naptha/tesseract.js) for client-side OCR
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) for the PWA manifest + service worker

Tailwind / shadcn are still in `package.json` (legacy from the initial scaffold) but the app runs on antd. New screens should use antd primitives.

## Project structure

```
src/
  pages/
    Index.tsx                  # Main app shell (top tabs on desktop, bottom nav on mobile)
    About.tsx
    Privacy.tsx
    NotFound.tsx
  components/
    AppHeader.tsx              # Sticky header with title + share button
    BottomNav.tsx              # Mobile bottom tab bar (Contacts / Add / Events)
    ContactList.tsx            # Search, filter chips, list, export menu
    ContactDetail.tsx          # Drawer view of a contact + Save to phone + Delete
    ContactForm.tsx            # Add/edit form (event field is collapsible)
    CardScanner.tsx            # Upload + OCR + progress
    EventSelect.tsx            # Inline event picker w/ "+ create new"
    EventsTab.tsx              # CRUD for events
    TagBadge.tsx
    opsette-share/             # Shared share-button + footer-logo bundle (see _shared/)
  lib/
    contactsDb.ts              # IndexedDB CRUD for contacts + events
    ocr.ts                     # Tesseract worker + parsing heuristics
    exporters.ts               # CSV + vCard (single + bulk)
    theme.ts                   # antd theme tokens + color palette (single source of truth)
  styles/
    global.css                 # CSS variables, layout helpers, bottom nav, link styles
  main.tsx                     # ConfigProvider + PWA registration guard
```

### Where colors live

All color values are in [src/lib/theme.ts](src/lib/theme.ts) (antd tokens + a `colors` object) and the matching CSS variables in [src/styles/global.css](src/styles/global.css) (`--cc-color-*`). Components reference those — no hard-coded hex values in component files.

## Data model

Two IndexedDB stores in the `contact-capture` database (version 2):

```ts
// contacts
{
  id: string;          // uuid
  name, company, email, phone: string;
  metAt: string;       // free-form ("by the bar")
  eventId?: string;    // optional link to an event
  eventName?: string;  // snapshot of the event name at link time
  metDate?: string;    // yyyy-mm-dd
  memorableDetail: string;
  followUp: string;
  tag: 'Hot' | 'Maybe' | 'Friend';
  createdAt, updatedAt: number;
}

// events
{
  id: string;
  name: string;
  date: string;        // yyyy-mm-dd, optional
  location: string;
  notes: string;
  createdAt, updatedAt: number;
}
```

Events are **never required** on a contact. Deleting an event keeps the snapshot of `eventName` on each linked contact so you don't lose context.

## Develop

```sh
npm install
npm run dev      # http://localhost:8080
```

The Vite config reads `VITE_BASE` from the environment so the app works at `/` locally and at `/contact-capture/` on GitHub Pages. Routing uses `import.meta.env.BASE_URL` as the React Router basename, so `/about` and `/privacy` work in both environments.

```sh
npm run build    # production build
npm test         # unit tests (vitest)
npx tsc --noEmit # typecheck
```

## Deploy

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds with `VITE_BASE=/<repo-name>/` and publishes to GitHub Pages. No additional config required — the repo just needs Pages enabled with GitHub Actions as the source.

## Privacy

Everything is local. There is no backend, no analytics, no cookies. See [src/pages/Privacy.tsx](src/pages/Privacy.tsx) for the user-facing version.

## Opsette family

This app uses the shared share-button + footer-logo bundle from `c:\Opsette Tools\_shared\opsette-share\`. See [_shared/opsette-share/INTEGRATION.md](../_shared/opsette-share/INTEGRATION.md) for the per-app integration checklist used across the family.
