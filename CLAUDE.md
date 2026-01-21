# JobTracker

A mobile-first web application for tracking permits, vehicles, bills, deposits, inspections, and daily tasks.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Hosting**: GitHub Pages
- **Theme**: Black and yellow color scheme

## Key Files

- `index.html` - Main HTML structure, Firebase SDK imports, tab navigation
- `app.js` - All application logic, Firebase integration, form handling
- `styles.css` - All styling, mobile-first responsive design
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline support

## Firebase Collections

- `permits` - Permit records (county or city permits)
- `vehicles` - Vehicle fleet tracking
- `bills` - Bills and expenses
- `deposits` - Customer deposits
- `inspections` - Inspection records
- `todos` - Admin todo items
- `activity` - Daily activity log
- `followups` - Flagged items for follow-up

## User Roles

- **Admin**: Full CRUD access, can dismiss follow-ups, sees ToDo and Activity tabs
- **Regular users**: Read-only access, can flag items for admin follow-up
- Admin UIDs are defined in `ADMIN_UIDS` array in app.js

## Features

- reCAPTCHA v2 on login/signup
- Image upload for permits (Firebase Storage)
- Collapsible grouping (permits by county/city, bills by status, activity by date)
- Auto-flag vehicles with registration renewal within 30 days
- Auto-cleanup: Activity items after 90 days, paid bills after 1 year
- Flag system for non-admin users to notify admin of items needing attention

## Deployment

Push to `main` branch - GitHub Pages auto-deploys from there.

## Firebase Console

- Project: jobtracker-582b9
- Firestore rules and Storage rules must be configured in Firebase Console
