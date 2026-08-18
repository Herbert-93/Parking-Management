# Architecture Overview

## What you're getting

Three applications that share one Firebase project:

1. **`mobile-app/`** — Flutter app for parking attendants. Sign in, photograph
   a car, log it in with a duration/rate, see currently parked cars, log
   cars out (final cost auto-calculated, including overage if they stayed
   longer than paid for).
2. **`backend/`** — Node/TypeScript/Express API deployed on Render. Owns all
   business logic: creating sessions, calculating costs, enforcing that only
   the lot's own manager/owner can see its data. Talks to Firestore using the
   **Firebase Admin SDK** (full trusted access, bypasses security rules).
3. **`admin-panel/`** — Next.js web app deployed on Render. The owner's
   dashboard: live occupancy, revenue, full history, and rate-plan
   management. Managers can also sign in here to check the day's activity,
   though their day-to-day tool is the mobile app.

## Why the backend exists (not just direct-to-Firestore clients)

Both the mobile app and the admin panel could theoretically talk to
Firestore directly using Firebase's client SDKs. Instead, all real data
operations funnel through the backend API because:

- **One place for business logic.** Cost calculation (including overage
  pricing), duplicate-plate checks, and "only see your own lot's data" are
  written once and used by both clients — no risk of the two apps
  calculating a price differently.
- **Firestore security rules are trivial.** `firestore.rules` denies all
  direct client access; only the Admin SDK (which ignores rules) can touch
  the database. There's no rules logic to get subtly wrong.
- **Easier to evolve.** Adding an SMS receipt, a payment integration, or a
  reporting export later means changing one backend, not two clients.

**Car photos don't use Firebase Storage at all** (Storage requires the
paid "Blaze" plan even for tiny amounts of data, which this project
deliberately avoids). Instead, the mobile app compresses the photo down to
a small JPEG (roughly 15–40KB) at capture time, base64-encodes it, and
sends it as a normal field on the session document. Firestore documents
can hold up to 1MB, so a compressed thumbnail fits comfortably — the
backend rejects anything unexpectedly large as a safety net.

## Data model (Firestore)

```
lots/{lotId}
  name, ownerUid, createdAt

lots/{lotId}/rates/{rateId}
  label ("12 hours"), durationHours, price, active

lots/{lotId}/sessions/{sessionId}
  plateNumber, photoBase64, rateId, rateLabel, ratePrice, durationHours,
  entryTime, expectedExitTime, exitTime, status ("active"|"completed"),
  finalCost, overageHours, overageCost, createdBy, closedBy, notes

users/{uid}
  name, email, role ("owner"|"manager"), lotId
```

- The person who **registers without a lotId** becomes an **owner** and a
  new `lots/{lotId}` document is created for them.
- Anyone who registers **with a lotId** (given to them by the owner — the
  admin panel sidebar shows it) becomes a **manager** on that lot.
- A rate plan is a duration + price preset, e.g. "5 hours — $5", "12 hours —
  $10", "24 hours — $18". The attendant picks one at entry. On exit, if the
  car stayed *within* that duration, the customer pays exactly the rate
  price. If they overstayed, the backend adds an overage charge computed as
  `(ratePrice / durationHours) * ceil(extra hours)`.

## Request flow: logging a car in

1. Attendant opens the Flutter app, signs in (Firebase Auth).
2. Takes a photo → compressed and base64-encoded on-device.
3. Enters the plate, picks a rate plan.
4. App calls `POST /api/sessions` on the backend with a Firebase **ID
   token** in the `Authorization: Bearer` header.
5. Backend verifies the token with the Admin SDK, looks up the caller's
   `users/{uid}` profile to find their `lotId`, then writes the new
   session document under `lots/{lotId}/sessions`.

## Request flow: logging a car out

1. Attendant (or owner, from the admin panel) taps "Log out" on an active
   session.
2. `POST /api/sessions/:id/exit` — backend computes elapsed time, compares
   to the paid duration, calculates `finalCost`, marks the session
   `completed`.

## Deployment topology

```
Firebase (Auth + Firestore)
        ▲                      ▲
        │ Admin SDK            │ Auth SDK only
        │                      │
 backend (Render)  <──REST──  admin-panel (Render)
        ▲
        │ REST (Bearer token)
        │
   mobile-app (Flutter, on attendants' phones)
```

Two independent Render web services (`backend`, `admin-panel`), one
Firebase project, one Flutter codebase built to Android/iOS.
