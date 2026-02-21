# JobTracker

A mobile-first web application for tracking permits, vehicles, bills, deposits, inspections, business licenses, and daily tasks.

**Live URL**: https://99redder.github.io/JobTracker/

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Hosting**: GitHub Pages
- **Theme**: Black and yellow color scheme

## Key Files

- `index.html` - Main HTML structure, Firebase SDK imports, tab navigation
- `app.js` - All application logic, Firebase integration, form handling (~2500 lines)
- `styles.css` - All styling, mobile-first responsive design, desktop layout (~1540 lines)
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline support
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
- Admin UIDs are defined in the `ADMIN_UIDS` array in app.js (line ~40)
- Admin bypasses the approval system entirely

## User Approval Flow

New user registration requires admin approval before accessing the app:

1. User signs up (email/password or Google) → added to `pendingUsers` collection
2. User sees "pending approval" screen (`pending-approval-container`)
3. Admin sees pending users in the Home tab under "Pending User Approvals"
4. Admin approves → user moved from `pendingUsers` to `approvedUsers`; admin rejects → removed from `pendingUsers`
5. Approved users can access the app normally

Google sign-in users who haven't signed up before are auto-added to `pendingUsers` as "orphaned" accounts.

**UX update (2026-02-21):** Approval/rejection confirmations are now branded in-app modals (reusing `#delete-modal`) via `showConfirmDialog(...)` in `app.js` instead of browser-native `confirm()`/`alert()` dialogs.

**Migration**: When first deploying the approval system, run `migrateExistingUsers()` from the browser console as an admin to auto-approve pre-existing users (app.js line ~2390).

## Authentication

- Firebase Email/Password auth + Google Sign-In (popup)
- reCAPTCHA v2 (checkbox) on login and signup forms
- Frontend constants:
  - `RECAPTCHA_SITE_KEY`
  - `RECAPTCHA_VERIFY_URL` (Cloud Function endpoint)
- Backend verification is required and implemented in Firebase Functions (`verifyRecaptchaToken`) before login/signup proceeds.
- reCAPTCHA backend secret now uses Firebase **params API** (`defineString('RECAPTCHA_SECRET')`) — not deprecated `functions.config()`.
- Three UI containers: `auth-container`, `app-container`, `pending-approval-container`
- Auth state observer at app.js line ~700 routes users to the correct container

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
- Auto-flags vehicles with renewal within 30 days (`autoFlagVehicleRenewals` at line ~2240)
- Sortable by renewal date or year

### Bills
- Entry type: Bill or Expense
- Three collapsible sections: Unpaid Bills, Paid Bills, Paid Expenses
- "Paid On" date field (`paidOn`) appears when status is Paid
- Check number field appears when payment method is Check
- **Unpaid Bills** section has a "Summary" button that opens `#unpaid-summary-modal`
  - Shows vendor + amount per bill, yellow divider, bold total
  - `showUnpaidSummary(unpaidBills)` in app.js (UI Utilities section, line ~1060)
  - CSS classes: `.modal-summary`, `.summary-body`, `.summary-row`, `.summary-vendor`, `.summary-amount`, `.summary-divider`, `.summary-total-row`
- **Paid Bills** section has a sort toggle button (Date ↑ / Date ↓) to sort by `paidOn` date
  - Sort state: `paidBillsSortDesc` (module-level boolean, default `false` = ascending)
- **Paid Expenses** section has a sort toggle button (Date ↑ / Date ↓) to sort by `paidOn` date
  - Sort state: `paidExpensesSortDesc` (module-level boolean, default `false` = ascending)
- Both sort buttons and the Summary button reuse the `.expense-sort-btn` CSS class
- Auto-cleanup: paid bills older than 1 year (`cleanupOldPaidBills` at line ~1210)

### Activity
- Auto-cleanup: items older than 90 days (`cleanupOldActivities` at line ~1180)
- Grouped by date (collapsible)

### Business Licenses
- Fields: Jurisdiction, License Number, Expiration Date
- Photo upload via Firebase Storage
- Auto-flags licenses expiring within 30 days (`autoFlagLicenseExpirations` at line ~2275)

### Conditional Form Fields
- `showIf` - Show field only when condition met
- `disableIf` - Disable field when condition met
- `requiredIf` - Make field required when condition met
- Logic handled in `updateConditionalFields()` inside `openModal()` (app.js line ~960)

### Legal Modal
- Privacy Policy and Terms of Service shown in a modal (`legalModal`)
- Triggered by links on login/signup forms
- `openLegalModal(kind)` at app.js line ~470; kind is `'privacy'` or `'terms'`

## app.js Section Map

The file is organized with `// ====` section comments at major boundaries:

| Section | Approx. Line | Contents |
|---|---|---|
| Firebase Config + Init | 1 | `firebaseConfig`, `auth`, `db`, `storage` |
| DOM Elements | 20 | All `getElementById` references |
| Constants & State | 35 | `currentUser`, `ADMIN_UIDS`, `isAdmin()` |
| User Approval System | 50 | `checkUserApproval`, `loadPendingUsers`, `approvePendingUser`, `rejectPendingUser` |
| Follow-Up System | 85 | `flagForFollowUp`, `dismissFollowUp`, `loadFollowUps` |
| Form Configurations | 300 | `formConfigs` object — field definitions for all 8 categories |
| UI Utilities & Auth Handlers | 390 | `showLoading`, `showMessage`, login/signup/reset/Google handlers, `openLegalModal`, `showUnpaidSummary` |
| Auth State Observer | 705 | `auth.onAuthStateChanged`, `updateAdminUI`, `openModal`, `closeModal` |
| Data Loading & Cleanup | 1060 | `withTimeout`, `loadAllData`, `cleanupOldActivities`, `cleanupOldPaidBills`, `loadData` |
| Rendering | 1325 | `collapsedBillStatus`, `paidBillsSortDesc`, `paidExpensesSortDesc`, card builders (`createTaskItem`, `createPermitCard`, `createBillCard`, etc.), `renderList` |
| Utility Functions | 2315 | `escapeHtml`, `formatDate`, `formatMonth`, `isRegistrationWithin30Days`, `isLicenseExpiringWithin30Days`, `autoFlagVehicleRenewals`, `autoFlagLicenseExpirations` |
| Migration Function | 2380 | `migrateExistingUsers()` — run once from console to approve pre-existing users |

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
- Admin-only UI elements use the `.admin-only` CSS class; toggled by `updateAdminUI()`

## Desktop Layout

At ≥1100px the app automatically switches to a sidebar layout via a `@media (min-width: 1100px)` block at the end of `styles.css`. **Mobile layout below 1100px is completely unchanged.**

### What changes at ≥1100px
- `#app-container` becomes a CSS Grid: `220px sidebar | 1fr content`
- `.app-header` spans both columns (row 1)
- `.tab-nav` moves to the left sidebar (row 2, col 1): vertical flex, `border-right`, `background: #111111`
- `.tab-btn` switches to full-width horizontal rows with a yellow left-border active indicator instead of bottom-border
- `.tab-content` fills the right column (row 2, col 2), scrolls independently, no `max-width` cap
- `.modal-content` widens to `max-width: 640px`
- `.bill-status-group`, `.county-group`, `.date-group` get `grid-column: 1 / -1` so grouped sections (bills, permits, activity) always span full width rather than splitting into card columns

### What does NOT change
- All mobile CSS below 1100px
- `index.html`, `app.js`, `manifest.json`, `sw.js` — no changes needed
- Tab switching logic — class toggling works identically in both layouts
- `.invite-container` — `position: fixed` is viewport-relative, unaffected by grid

## Security

- API key restricted in Google Cloud Console:
  - HTTP referrers: `99redder.github.io/*` and `localhost`
  - API restrictions: Identity Toolkit API, Firebase Installations API, Token Service API
- Firestore security rules must grant:
  - `pendingUsers`: authenticated users can create their own doc; admins can read/write all
  - `approvedUsers`: all authenticated users can read; only admins can write
  - All other collections: authenticated users read; admins write
- `escapeHtml()` used when rendering untrusted user data to prevent XSS

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

For reCAPTCHA backend verification, ensure params secret is set before deploy:

```bash
firebase deploy --only functions
```

Firebase CLI will prompt for `RECAPTCHA_SECRET` (or set it ahead of time in params).

## Firebase Console

- Project ID: `jobtracker-582b9`
- Firestore rules and Storage rules must be configured in Firebase Console
- Storage rules needed for permit and license image uploads
