# Setup Guide — from zero to a working system

Read `ARCHITECTURE.md` first if you want the big picture. This guide is a
literal, ordered checklist. Follow it top to bottom.

---

## Part 1 — Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   (e.g. "parking-manager") → disable Google Analytics (not needed) →
   **Create project**.

2. **Enable Authentication**
   - Left sidebar → **Build → Authentication** → **Get started**.
   - Under **Sign-in method**, enable **Email/Password**.

3. **Enable Firestore**
   - Left sidebar → **Build → Firestore Database** → **Create database**.
   - Choose **Production mode** (we ship our own `firestore.rules`).
   - Pick any region close to your users.

   > **We deliberately don't use Firebase Storage.** Google now requires
   > the paid "Blaze" plan to enable it, even for a few KB of data. Instead,
   > car photos are compressed on the phone and stored as base64 strings
   > directly inside the Firestore document — no separate storage product,
   > no billing card required.

4. **Deploy the Firestore security rules** (from the project root, `parking-management/`):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```
   During `firebase init`:
   - Select **Firestore** only (spacebar to select, enter to confirm).
   - Choose **Use an existing project** → pick the project you just created.
   - When asked for the Firestore rules file, point it at `firestore.rules`
     (already in this folder) — keep the default filename or overwrite.
   - Say **No** to overwriting the file if it asks (it already exists here).

   Then deploy:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Get the Admin SDK service account key** (for the backend)
   - **Project settings** (gear icon) → **Service accounts** → **Generate
     new private key** → confirm. A JSON file downloads.
   - Open it. You'll copy three fields into the backend's `.env` in Part 2:
     `project_id`, `client_email`, `private_key`.

6. **Get the Web app config** (for the admin panel)
   - **Project settings → General** → scroll to **Your apps** → click the
     **Web** icon (`</>`) → register an app (nickname anything, no hosting
     needed) → copy the `firebaseConfig` object shown. You'll use these
     values in Part 3.

7. **Register Android/iOS apps** — done automatically in Part 4 via the
   FlutterFire CLI, no manual step needed here.

---

## Part 2 — Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `FIREBASE_PROJECT_ID` → `project_id` from the service account JSON.
- `FIREBASE_CLIENT_EMAIL` → `client_email` from the JSON.
- `FIREBASE_PRIVATE_KEY` → `private_key` from the JSON, **keep it in
  quotes**, keep the `\n` sequences as literal text (don't turn them into
  real line breaks).
- `CORS_ORIGINS` → for now, `http://localhost:3000` (add your Render admin
  panel URL here later, comma-separated).

  (There's no `FIREBASE_STORAGE_BUCKET` variable — this project doesn't use
  Firebase Storage. Car photos are compressed on the phone and stored as
  base64 strings directly on the Firestore document.)

Run it locally:
```bash
npm run dev
```
You should see `Parking backend listening on port 4000`. Sanity check:
```bash
curl http://localhost:4000/health
# -> OK
```

### Deploy to Render

1. Push this whole `parking-management/` folder to a GitHub repo.
2. In the [Render dashboard](https://dashboard.render.com) → **New → Web
   Service** → connect your repo → set **Root Directory** to `backend`.
3. Render will detect `render.yaml` (Node runtime, build = `npm install &&
   npm run build`, start = `npm start`). If it doesn't auto-detect, set
   those commands manually.
4. Under **Environment**, add the same variables as your `.env` file
   (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
   `CORS_ORIGINS`). For `FIREBASE_PRIVATE_KEY`,
   paste it exactly as it appears in the JSON file (Render's env var editor
   handles the newlines fine either as literal `\n` or actual line breaks —
   the backend code normalizes both).
5. Deploy. Note the resulting URL, e.g. `https://parking-backend.onrender.com`
   — you need it in Parts 3 and 4.
6. Once you also have the admin panel's URL (Part 3), come back and add it
   to `CORS_ORIGINS` (comma-separated), then redeploy.

> **Free tier note:** Render's free web services sleep after inactivity and
> take ~30–60s to wake on the next request. Fine for testing; upgrade to a
> paid instance for a live parking lot so attendants aren't stuck waiting.

---

## Part 3 — Admin panel (`admin-panel/`)

```bash
cd admin-panel
npm install
cp .env.local.example .env.local
```

Edit `.env.local` with the Web app `firebaseConfig` values from Part 1 step
6, plus your backend URL:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Run locally:
```bash
npm run dev
```
Open http://localhost:3000 → redirects to `/register` → create the owner
account (name + parking lot name + email + password). This calls Firebase
Auth directly, then calls the backend to create the `lots/{id}` and
`users/{uid}` documents. You land on `/dashboard`.

Add at least one rate plan under **Rate plans** (e.g. "5 hours" / 5 / $5,
"12 hours" / 12 / $10, "24 hours" / 24 / $18) — the mobile app needs at
least one to log a car in.

### Deploy to Render

1. Same repo, **New → Web Service** → **Root Directory** = `admin-panel`.
2. Build = `npm install && npm run build`, start = `npm start` (from
   `render.yaml`).
3. Add all `NEXT_PUBLIC_*` env vars plus `NEXT_PUBLIC_API_BASE_URL` (your
   backend's Render URL from Part 2).
4. Deploy. Note the URL, e.g. `https://parking-admin-panel.onrender.com`.
5. Go back to the **backend's** Render env vars and set `CORS_ORIGINS` to
   include this URL, then redeploy the backend.

---

## Part 4 — Mobile app (`mobile-app/`)

Prerequisites: [Flutter SDK](https://docs.flutter.dev/get-started/install)
installed, and either an Android emulator, iOS simulator (Mac only), or a
physical phone with USB debugging / developer mode on.

```bash
cd mobile-app
flutter create .
```
This generates the `android/`, `ios/`, etc. platform folders around the
existing `lib/` and `pubspec.yaml` (it won't overwrite your `lib/` code).

Install dependencies:
```bash
flutter pub get
```

### Connect it to Firebase

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```
- Pick the same Firebase project from Part 1.
- Select platforms (Android and/or iOS).
- This overwrites the placeholder `lib/firebase_options.dart` with real
  values and registers the apps in Firebase automatically.

### Apply platform permissions

Follow `mobile-app/README.md` — add the camera/internet permission lines to
`android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist`.

### Point it at your backend

Either edit the `defaultValue` in `lib/utils/constants.dart`, or always run
with:
```bash
flutter run --dart-define=API_BASE_URL=https://parking-backend.onrender.com
```

### Run it

```bash
flutter run --dart-define=API_BASE_URL=https://parking-backend.onrender.com
```

On first launch:
- Tap **New here? Create an account**.
- Choose **Join existing lot** (the owner registered the lot already via
  the admin panel in Part 3) and paste the **Lot ID** shown at the bottom
  of the admin panel's sidebar.
- This creates the attendant as a **manager** on that lot.

Now: **Log in** tab → take a photo → enter a plate → pick a rate → **Log
car in**. Check the **Parked** tab to see it, and the admin panel's
**Currently parked** page — both read from the same backend, so it appears
in real time (the admin panel polls every 20–30s; pull-to-refresh works
immediately in the app).

### Building a release APK/IPA later

```bash
flutter build apk --dart-define=API_BASE_URL=https://parking-backend.onrender.com
flutter build ios --dart-define=API_BASE_URL=https://parking-backend.onrender.com
```
(iOS builds require a Mac + Xcode + an Apple Developer account to sign and
distribute.)

---

## Part 5 — End-to-end smoke test

1. Owner signs up on the admin panel → adds 2–3 rate plans.
2. Owner copies the **Lot ID** from the sidebar, sends it to an attendant.
3. Attendant registers in the mobile app using that Lot ID → logs a test
   car in with a photo.
4. Owner refreshes the admin panel's **Currently parked** page → sees the
   car, with its photo thumbnail shown directly in the table.
5. Attendant (or owner) taps **Log out** on that car → final cost appears.
6. Owner checks **History** → the completed session with its cost is there,
   and **Overview** shows updated revenue for the day.

If all six steps work, the whole system — Flutter app, Express/TypeScript
backend, Next.js admin panel, and Firebase — is correctly wired end to end.

---

## Troubleshooting

- **"No user profile found" / 403 on API calls** — the client created a
  Firebase Auth account but never called `register-profile`. Sign out and
  register again through the app/admin panel's registration flow (don't
  create users directly in the Firebase console).
- **CORS errors in the admin panel** — add the admin panel's exact Render
  URL to the backend's `CORS_ORIGINS` env var and redeploy the backend.
- **Mobile app can't reach the backend on an emulator** — Android emulators
  can't use `localhost` for the host machine; use `10.0.2.2` instead when
  testing against `npm run dev` locally (see `constants.dart` comment).
- **Photo doesn't show up / entry fails with "Photo is too large"** — the
  mobile app compresses photos to ~480px wide at low quality before
  encoding, which should always stay well under the backend's 700KB cap.
  If you changed `imageQuality`/`maxWidth` in `entry_screen.dart` to
  something less aggressive, dial it back down.
- **Render free-tier cold start** — the first request after idling can take
  30–60 seconds; this is expected on the free plan, not a bug.
