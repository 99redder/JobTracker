# Job Tracker

A mobile-first web application for tracking permits, vehicles, bills, deposits, inspections, business licenses, and daily tasks.

**Live URL**: https://99redder.github.io/JobTracker/

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Hosting**: GitHub Pages
- **Theme**: Light (default) and dark modes with a yellow (#facc15) brand accent

## Key Files

- `index.html` - Main HTML structure, Firebase SDK imports, tab navigation
- `app.js` - All application logic, Firebase integration, form handling (~2815 lines)
- `styles.css` - All styling, theme tokens, mobile-first responsive design, desktop layout (~1970 lines)
- `theme-init.js` - Applies the saved light/dark theme before first paint (loaded in `<head>`)
- `install.js` - PWA install: one-tap prompt, install banners, device-specific install guide modal
- `sw-register.js` - Registers the service worker and shows the "Update" bar for new versions
- `manifest.json` - PWA manifest (name "Job Tracker", `any` + `maskable` icons)
- `sw.js` - Service worker for offline support (app shell only, never Firestore/Storage data)
- `generate-icons.html` - Icon generator (wrench on yellow); see `ICONS-README.md`
- `functions/index.js` - Firebase Cloud Functions (storage cleanup on document delete)

## Firebase Collections

- `permits` - Permit records (county or city permits)
- `vehicles` - Vehicle fleet tracking
- `bills` - Bills and expenses
- `deposits` - Customer deposits
- `inspections` - Inspection records
- `licenses` - Business license tracking
- `activity` - Daily activity log
- `followups` - Flagged items for follow-up
- `pendingUsers` - New signups awaiting admin approval
- `approvedUsers` - Users approved for app access

## User Roles

- **Admin**: Full CRUD access, can dismiss follow-ups, sees Activity tab, approves/rejects new users
- **Regular users**: Read-only access, can flag items for admin follow-up
- Admin access is controlled by Firebase Custom Claims (`request.auth.token.admin == true`)
- Bootstrap the first admin with `scripts/bootstrap-admin.js`; admins can later call `setAdminClaim` from trusted admin sessions
- Admin bypasses the approval system entirely

## User Approval Flow

New user registration requires admin approval before accessing the app:

1. User signs up with email/password → added to `pendingUsers` and sent a verification email (`sendVerificationEmail()`; the link's continue URL returns to the app). They stay signed in and land on the pending screen (`pending-approval-container`). The auth observer skips routing while `signupInProgress` so the pending doc exists first.
2. Until Firebase marks the email verified, the pending screen says **Check Your Email** with **Check Again** and **Resend verification email**. Check Again reloads the user and `showScreenForUser()` re-checks using the refreshed ID token's `email_verified` claim.
3. Once verified, the user's own client sets `emailVerified: true` on their `pendingUsers` doc (Firestore rules allow only that field, only with a verified token), and the screen switches to **Pending Approval**.
4. Admin sees pending users in the Home tab under "Pending User Approvals", each tagged **✓ Email verified** or **Email not verified yet**. Approving an unverified user shows an "Email Not Verified" warning with **Approve Anyway** (anyone can sign up with an address they don't own).
5. Admin approves → user moved from `pendingUsers` to `approvedUsers` (with `emailVerified` recorded); admin rejects → removed from `pendingUsers`
6. Approved users can access the app normally (existing approved users are not required to verify). A pending user can tap **Check Again** instead of logging out and back in.

Unknown/orphaned auth accounts are no longer auto-added to `pendingUsers`; users should sign up with email/password or contact an admin.

**UX update (2026-02-21):** Approval/rejection confirmations are now branded in-app modals (reusing `#delete-modal`) via `showConfirmDialog(...)` in `app.js` instead of browser-native `confirm()`/`alert()` dialogs.

**Migration**: When first deploying the approval system, bootstrap the first admin claim with `scripts/bootstrap-admin.js`, then run `migrateExistingUsers()` from the browser console as an admin to auto-approve the current admin user.

## Authentication

- Firebase Email/Password auth only
- Signup passwords must be 10+ characters with uppercase, lowercase, digit, and special character. Firebase Auth enforces this server-side (Authentication → Settings → Password policy: **Require** mode, "Force upgrade on sign-in" **off**, so accounts with older passwords can still log in). The app's checklist (`PASSWORD_RULES` in `app.js`) mirrors the policy, including Firebase's special-character set `^ $ * . [ ] { } ( ) ? " ! @ # % & / \ , > < ' : ; | _ ~` (`+ - =` and backtick don't count). If old accounts ever get locked out, switch the policy to Notify.
- Email enumeration protection is on. Multi-factor auth would need the Identity Platform upgrade (not enabled).
- No Google OAuth and no client-side reCAPTCHA gate on login/signup
- Three UI containers: `auth-container`, `app-container`, `pending-approval-container`
- Auth state observer at app.js line ~945 calls `showScreenForUser()` (~line 905), which routes users to the correct container

## Theme (Light / Dark)

- Light is the default for everyone; dark is opt-in via the sun/moon button in the app header (`#theme-toggle`).
- The choice is stored per device in localStorage `jobtracker-theme` (`'dark'` or `'light'`).
- `theme-init.js` sets `data-theme` on `<html>` before first paint (an external file because the CSP blocks inline scripts) and sets `<meta name="theme-color">` (`#ffffff` light / `#000000` dark). The toggle logic is the `THEME` section of `app.js`.
- All colors are CSS variables in `:root` (light) with overrides in `:root[data-theme="dark"]` at the top of `styles.css`. Use the tokens, not hex values, for new UI:
  - `--primary-color` yellow is for **backgrounds** (buttons, badges, borders) with black text.
  - `--accent-text` for yellow-ish **text/icons** on neutral surfaces (yellow-700 `#a16207` in light, `#facc15` in dark) — plain yellow text is unreadable on white.
  - `--flag-color` for flag buttons and follow-up categories.
  - Surfaces: `--bg-color`, `--card-bg`, `--surface-alt` (group headers), `--surface-hover`, `--input-bg`, `--header-bg`, `--nav-bg`, `--sidebar-bg`, `--secondary-bg`/`--secondary-hover`, `--overlay`, `--loading-overlay`, `--auth-bg`.
- The mobile header is 48px (`min-height`) and `.tab-nav` sticks at `top: 48px` directly beneath it; keep these in sync if the header changes.

## App Install (PWA)

Modeled on the bibleapp install flow, in vanilla JS (`install.js`, wrapped in an IIFE, loaded in `<head>` so Chrome's one-time `beforeinstallprompt` is never missed).

- **One tap** on Chrome/Edge/Samsung Internet: the captured `beforeinstallprompt` drives the "Install" buttons.
- **Everywhere else** (iPhone/iPad, Firefox, Mac Safari, in-app browsers like Facebook): "Show me how" opens `#install-modal` with device-detected steps, hint chips that mimic the button to look for, a device switcher, and "Copy link" for in-app browsers.
- Entry points: `[data-install-banner]` cards on the login screen, the pending-approval screen ("While you wait, install the app") and the Home tab; the header download button (`#install-btn`); and the `#install` URL hash, which opens the guide on load. **Invite Others** shares `https://99redder.github.io/JobTracker/#install`.
- Everything install-related hides inside the installed app (`display-mode: standalone` / `navigator.standalone`). Dismissing a banner is remembered per device in localStorage `jobtracker-install-dismissed` (the header button stays).
- iOS note shown to users: an installed iOS web app keeps its own sign-in, separate from Safari, so they log in once inside it.
- Installing never bypasses approval: the installed app shows the same login → pending → app flow.

### Icons

- The icon is the logo's wrench (Feather "tool") in black on the brand yellow `#facc15`.
- `icon.svg` (SVG favicon), `favicon-16/32/48`, `apple-touch-icon.png` (full bleed, no alpha), `icon-192/512` (`any`, rounded tile), `icon-maskable-192/512` (`maskable`, wrench inside the 80% safe zone).
- Regenerate with `generate-icons.html` (see `ICONS-README.md`).

### Service worker updates

- `sw.js` no longer calls `skipWaiting()` on install. A new version waits, and `sw-register.js` shows `#update-banner` ("A new version of Job Tracker is ready. [Update]"). Tapping Update posts `'skipWaiting'`, and the page reloads on `controllerchange` only when the user asked, so nobody loses a half-filled form.
- **Bump `CACHE_NAME` in `sw.js` and add any new static file to `STATIC_ASSETS` and to the copy list in `.github/workflows/deploy-pages.yml`.**

## Tabs (8 total)

1. **Home** - Flagged follow-up items + Pending User Approvals (admin only)
2. **Permits** - County or city permits with photo upload
3. **Vehicles** - Fleet tracking with registration renewal alerts
4. **Bills** - Bills and expenses (Unpaid Bills, Paid Bills, Paid Expenses sections)
5. **Deposits** - Customer deposit tracking
6. **Inspections** - Inspection records
7. **Licenses** - Business license tracking with expiration alerts
8. **Activity** - Admin-only daily activity log

## Key Features

### Permits
- **Permit Type**: County Permit or City Permit (first dropdown)
- When City Permit selected: county dropdown disabled, city field required
- When County Permit selected: county required, city optional
- Grouped by county (for county permits) or city (for city permits)
- Photo upload via Firebase Storage
- Counties: Wicomico, Worcester, Somerset, Dorchester, Talbot, Caroline, Queen Anne's, Kent, Cecil, Harford, Sussex DE, Kent DE, New Castle DE, Accomack VA, Northampton VA

### Vehicles
- Registration dates use month picker (YYYY-MM format)
- Auto-flags vehicles with renewal within 30 days (`autoFlagVehicleRenewals` at line ~2610)
- Sortable by renewal date or year

### Bills
- Entry type: Bill or Expense
- Three collapsible sections: Unpaid Bills, Paid Bills, Paid Expenses
- "Paid On" date field (`paidOn`) appears when status is Paid
- Check number field appears when payment method is Check
- **Unpaid Bills** section has a "Summary" button that opens `#unpaid-summary-modal`
  - Shows vendor + amount per bill, yellow divider, bold total
  - `showUnpaidSummary(unpaidBills)` in app.js (line ~1280)
  - CSS classes: `.modal-summary`, `.summary-body`, `.summary-row`, `.summary-vendor`, `.summary-amount`, `.summary-divider`, `.summary-total-row`
- **Paid Bills** section has a sort toggle button (Date ↑ / Date ↓) to sort by `paidOn` date
  - Sort state: `paidBillsSortDesc` (module-level boolean, default `false` = ascending)
- **Paid Expenses** section has a sort toggle button (Date ↑ / Date ↓) to sort by `paidOn` date
  - Sort state: `paidExpensesSortDesc` (module-level boolean, default `false` = ascending)
- Both sort buttons and the Summary button reuse the `.expense-sort-btn` CSS class
- Auto-cleanup: paid bills older than 1 year (`cleanupOldPaidBills` at line ~1545)

### Activity
- Auto-cleanup: items older than 90 days (`cleanupOldActivities` at line ~1515)
- Grouped by date (collapsible)

### Business Licenses
- Fields: Jurisdiction, License Number, Expiration Date
- Photo upload via Firebase Storage
- Auto-flags licenses expiring within 30 days (`autoFlagLicenseExpirations` at line ~2650)
- Photo/PDF uploads: JPEG, PNG, HEIC/HEIF, WebP, GIF, AVIF or PDF under 10 MB (no SVG). Replacing a file on edit deletes the old Storage object after the record saves (`attachmentRef()`); deleting a record deletes its file via Cloud Functions.

### Conditional Form Fields
- `showIf` - Show field only when condition met
- `disableIf` - Disable field when condition met
- `requiredIf` - Make field required when condition met
- Logic handled in `updateConditionalFields()` inside `openModal()` (app.js line ~990)

### Legal Modal
- Privacy Policy and Terms of Service shown in a modal (`legalModal`)
- Triggered by links on login/signup forms
- `openLegalModal(kind)` at app.js line ~720; kind is `'privacy'` or `'terms'`
- Contact address in both: `LEGAL_CONTACT_EMAIL` = `support@easternshore.ai`

## app.js Section Map

The file is organized with `// ====` section comments at major boundaries:

| Section | Approx. Line | Contents |
|---|---|---|
| Frame guard + Firebase Config + Init | 1 | refuses to run inside a frame; `firebaseConfig`, `auth`, `db`, `storage`; `escapeHtml`, `isSafeStorageUrl`, `statusClass` |
| DOM Elements | 47 | All `getElementById` references |
| Theme | 68 | `applyTheme`, `#theme-toggle` handler |
| Constants & State | 103 | `currentUser`, `currentUserClaims`, `isAdmin()`, upload validation, `attachmentRef` |
| Password Policy | 223 | `validatePassword`, password checklist/strength indicator |
| User Approval System | 270 | `checkUserApproval` |
| Follow-Up System | 303 | `flagForFollowUp`, `dismissFollowUp`, `loadFollowUps`, `loadPendingUsers`, `approvePendingUser`, `rejectPendingUser` |
| Form Configurations | 538 | `formConfigs` object — field definitions for all 8 categories |
| UI Utilities & Auth Handlers | 626 | `showLoading`, `showMessage`, login/signup/reset handlers, pending Check Again, `openLegalModal` |
| Auth State Observer | 900 | `showScreenForUser`, `auth.onAuthStateChanged`, `updateAdminUI`, `openModal`, `closeModal`, `showUnpaidSummary` |
| Data Loading & Cleanup | 1333 | `withTimeout`, modal submit, confirm dialog, `loadAllData`, `cleanupOldActivities`, `cleanupOldPaidBills`, `loadData` |
| Rendering | 1666 | `collapsedBillStatus`, `paidBillsSortDesc`, `paidExpensesSortDesc`, card builders (`createTaskItem`, `createPermitCard`, `createBillCard`, etc.), `renderList`, `autoFlagVehicleRenewals`, `autoFlagLicenseExpirations` |
| Utility Functions | 2686 | `formatDate`, keyboard dismiss, Invite Others |
| Migration Function | 2748 | `migrateExistingUsers()` — run once from console to approve pre-existing users |

## Rendering Architecture

- `loadData(category)` fetches from Firestore and calls `renderList(category, items)`
- `renderList()` dispatches to category-specific rendering:
  - Bills: renders three collapsible `.bill-status-group` divs (Unpaid, Paid Bills, Paid Expenses) — early return
  - Permits: groups into `.county-group` divs (county permits) or `.county-group.city-permit-group` divs (city permits) — early return
  - Deposits: `createDepositCard()`
  - Inspections: `createInspectionCard()`
  - Licenses: `createLicenseCard()`
  - Vehicles: `createTaskItem()` (sortable)
  - Activity: `createTaskItem()`, grouped into `.date-group` divs by date — early return
- Group divs (`.bill-status-group`, `.county-group`, `.date-group`) are appended directly to the `.items-list` element and need `grid-column: 1 / -1` in grid layouts to prevent splitting across columns
- Admin-only UI elements use the `.admin-only` CSS class; toggled by `updateAdminUI()` (which leaves admin-only tab panels like Activity hidden until their tab is selected)

## Desktop Layout

At ≥1100px the app automatically switches to a sidebar layout via a `@media (min-width: 1100px)` block at the end of `styles.css`. **Mobile layout below 1100px is completely unchanged.**

### What changes at ≥1100px
- `#app-container` becomes a CSS Grid: `220px sidebar | 1fr content`
- `.app-header` spans both columns (row 1)
- `.tab-nav` moves to the left sidebar (row 2, col 1): vertical flex, `border-right`, `background: var(--sidebar-bg)`
- `.tab-btn` switches to full-width horizontal rows with a yellow left-border active indicator instead of bottom-border
- `.tab-content` fills the right column (row 2, col 2), scrolls independently, no `max-width` cap
- `.modal-content` widens to `max-width: 640px`
- `.bill-status-group`, `.county-group`, `.date-group` get `grid-column: 1 / -1` so grouped sections (bills, permits, activity) always span full width rather than splitting into card columns

### What does NOT change
- All mobile CSS below 1100px
- `index.html`, `app.js`, `manifest.json`, `sw.js` — no changes needed (both themes work in both layouts)
- Tab switching logic — class toggling works identically in both layouts
- `.invite-container` — `position: fixed` is viewport-relative, unaffected by grid

## Security

- Web API key ("Job Tracker web key" in Google Cloud → APIs & Services → Credentials), as of 2026-10-22:
  - Website restrictions: `99redder.github.io/*` (plus the `/JobTracker/` entries), `jobtracker-582b9.firebaseapp.com/*`, `jobtracker-582b9.web.app/*`, `localhost`
  - API restrictions: Cloud Firestore API, Cloud Storage for Firebase API, Identity Toolkit API, Token Service API
- Firebase Auth authorized domains: `localhost`, `jobtracker-582b9.firebaseapp.com`, `jobtracker-582b9.web.app`, `99redder.github.io`
- Firestore point-in-time recovery (7 days) and a daily backup schedule (14-day retention) are on (Google Cloud → Firestore → (default) → Disaster recovery)
- App Check: Firestore and Auth are in Monitoring mode only and the app has no App Check SDK, so **never turn on enforcement** without adding App Check back to the client — it would block every request
- Billing budget "Firebase Project jobtracker-582b9 Monthly": $5/month with alerts at 50/90/100% (project is on Blaze)
- GitHub Pages deploy publishes only static app assets from `.pages`, not repo internals like rules or Functions source.
- Firestore rules (`firestore.rules`) — default deny, then:
  - App collections (`permits`, `vehicles`, `bills`, `deposits`, `inspections`, `licenses`): admins and approved users read; only admins write
  - `activity`: admins only
  - `pendingUsers`: a signed-in user can create only their own doc (fixed fields, own email, `signupDate == request.time`, no `emailVerified`) and later set only `emailVerified: true` on it when their token has `email_verified`; admins read/update/delete
  - `approvedUsers`: a user can read only their own doc; only admins write
  - `followups`: admins read/update/delete; approved users can create with validated fields (title ≤ 1000 chars, `flaggedAt == request.time`)
- Storage rules (`storage.rules`): admins and approved users read `permits/` and `licenses/`; admins upload raster images or PDFs under 10 MB
- `escapeHtml()` used when rendering untrusted user data (including attribute values) to prevent XSS; status values go through `statusClass()`
- The CSP is a `<meta>` tag (GitHub Pages can't set headers), so `frame-ancestors` would be ignored; instead `app.js` hides the page and stops if it is loaded inside a frame (clickjacking guard)

## Deployment

Push to `main` branch — GitHub Pages auto-deploys.

### Firebase Functions (Storage cleanup)

When a Firestore document is deleted, a Cloud Function best-effort deletes the associated Firebase Storage object.

- Collections covered: `permits`, `licenses`
- Image fields:
  - `image` (download URL)
  - `imagePath` (storage path; preferred for reliable deletes)

Deploy (from repo root):

```bash
firebase deploy --only functions
```

### Firestore & Storage rules

The rules in the repo are the source of truth. Deploy after changing them:

```bash
firebase deploy --only firestore:rules,storage
```

## Firebase Console

- Project ID: `jobtracker-582b9` (cannot be renamed); display name and app nickname: "Job Tracker"
- Firestore rules and Storage rules are deployed from `firestore.rules` / `storage.rules`
- Storage rules needed for permit and license image uploads
