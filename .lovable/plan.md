## Contact Capture — Mobile-First PWA

A local-only, installable PWA for capturing business contacts via card scan or manual entry, with memory notes, follow-ups, and tags. All data stored in IndexedDB.

### Stack & setup

- React + Vite + TypeScript (existing project)
- **antd** + **@ant-design/icons** as the primary UI system
- **tesseract.js** for client-side OCR
- **idb** (small IndexedDB wrapper) for local persistence
- **vite-plugin-pwa** for manifest + service worker (production only; disabled in dev/preview to avoid breaking the Lovable iframe)
- GitHub Actions workflow for GitHub Pages deploy with correct Vite `base` handling

Tailwind stays installed (used by shadcn) but new screens use Ant Design + a small global stylesheet with design tokens. Inline styles avoided.

### Theme

Light surfaces with a warm amber accent, configured via Ant's `ConfigProvider` theme tokens:

- Primary: warm amber (e.g. `#F59E0B`)
- Surface: white, soft gray page background
- Rounded corners (radius 10), generous spacing, system font stack
- Tag colors: Hot = red/amber, Maybe = blue, Friend = green

### Screens & flow

Single page app with two top tabs (Ant `Tabs`):

1. **All Contacts**
   - Search input (name / company / email)
   - Filter chips by tag: All / Hot / Maybe / Friend
   - Ant `List` of contact cards (avatar initials, name, company, tag)
   - Empty state with `Empty` component + CTA to add first contact
   - Tap a row → opens **Contact Detail** drawer/modal showing all fields, with Edit and Delete buttons

2. **Add New**
   - Ant `Upload` (camera capture enabled on mobile via `accept="image/*"` + `capture`) OR "Skip — enter manually" button
   - On image select: run Tesseract OCR with a progress bar, then auto-fill form fields using simple heuristics:
     - Email: regex match
     - Phone: regex match (international-ish)
     - Name: first non-empty line that isn't email/phone/url
     - Company: line in ALL CAPS or containing Inc/LLC/Ltd/Co, else second line
   - Editable form (all fields user-correctable):
     - Name, Company, Email, Phone
     - Where you met
     - Memorable detail (textarea)
     - Follow-up action
     - Tag (Select: Hot / Maybe / Friend)
   - Save button → writes to IndexedDB
   - Success `message` toast + two buttons: "Add another contact" (resets form) and "View contacts" (switches tab)

**Edit flow**: from Contact Detail, "Edit" reuses the same form component prefilled with existing values.

### Data model (IndexedDB)

Store: `contacts`
```
{
  id: string (uuid)
  name, company, email, phone: string
  metAt, memorableDetail, followUp: string
  tag: 'Hot' | 'Maybe' | 'Friend'
  createdAt, updatedAt: number
}
```

CRUD helpers in `src/lib/contactsDb.ts`: `getAll`, `getById`, `put`, `remove`.

### File structure

```
src/
  pages/Index.tsx                 # Tabs shell
  components/
    ContactList.tsx               # Search, filter, list rendering
    ContactListItem.tsx
    ContactDetail.tsx             # Drawer with full info + actions
    ContactForm.tsx               # Shared add/edit form
    CardScanner.tsx               # Upload + OCR + progress
    TagSelect.tsx
    TagBadge.tsx
    AppHeader.tsx
  lib/
    contactsDb.ts                 # IndexedDB via idb
    ocr.ts                        # Tesseract worker + parsing heuristics
    theme.ts                      # Ant theme tokens
  styles/
    global.css                    # Tokens, spacing, layout helpers
  main.tsx                        # ConfigProvider + PWA registration guard
```

### PWA configuration

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, `devOptions.enabled: false`
- Manifest: name "Contact Capture", short_name, theme color amber, `display: standalone`, icons (use a generated amber square with a contact icon for 192/512)
- Service worker registration guarded so it never registers inside an iframe or on `lovableproject.com` / `id-preview--` hosts — preview stays clean
- Offline-first naturally satisfied: app is fully client-side, data in IndexedDB

### GitHub Pages deploy

- `vite.config.ts`: read `base` from env (`VITE_BASE`) so it works at root locally and at `/repo-name/` on Pages
- `.github/workflows/deploy.yml`: build with `VITE_BASE=/<repo>/`, upload `dist`, deploy to Pages
- `public/404.html` SPA fallback for client-side routing on Pages

### Out of scope (explicitly)

- No backend, no auth
- No handwriting recognition
- No advanced OCR layout analysis — simple regex + line heuristics only
