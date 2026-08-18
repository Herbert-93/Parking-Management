# Parking Management System

A complete parking-lot management system:

- **`mobile-app/`** — Flutter app for attendants: photograph a car, log it
  in with a plate number and duration/rate, and log it out when it leaves
  (final cost auto-calculated, overage included).
- **`backend/`** — TypeScript/Express REST API, deployed on Render, backed
  by Firebase (Auth + Firestore + Storage) via the Admin SDK.
- **`admin-panel/`** — Next.js web dashboard, deployed on Render, for the
  parking lot owner: live occupancy, revenue, full history, rate-plan
  management. Managers can also sign in to check activity.

## Start here

1. **`docs/ARCHITECTURE.md`** — how the three pieces fit together and why.
2. **`docs/SETUP_GUIDE.md`** — literal, ordered, copy-pasteable setup steps
   from creating the Firebase project through running the mobile app on a
   phone. Follow it top to bottom; nothing else is required.

## Folder map

```
parking-management/
├── firestore.rules          # Firestore locked to backend-only access
├── backend/                  # Express + TypeScript API (→ Render)
├── admin-panel/               # Next.js dashboard (→ Render)
├── mobile-app/                 # Flutter attendant app
└── docs/
    ├── ARCHITECTURE.md
    └── SETUP_GUIDE.md
```
