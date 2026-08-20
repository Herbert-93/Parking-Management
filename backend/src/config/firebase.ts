import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

/**
 * Preferred method: a single base64-encoded copy of the entire service
 * account JSON file, in FIREBASE_SERVICE_ACCOUNT_BASE64. This is immune to
 * the #1 cause of Firebase Admin auth failures on hosts like Render — a
 * multi-line PEM private key getting its newlines mangled, truncated, or
 * mis-escaped when pasted into an environment variable text box. Base64
 * output is a single unbroken line with no special characters, so there is
 * nothing for a copy-paste or env-var UI to corrupt.
 *
 * How to generate it (run locally, once):
 *   Linux:   base64 -w 0 serviceAccountKey.json
 *   macOS:   base64 -i serviceAccountKey.json | tr -d '\n'
 * Then paste the single-line output as FIREBASE_SERVICE_ACCOUNT_BASE64.
 */
function loadCredential(): { credential: admin.credential.Credential; projectId: string } {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (serviceAccountBase64) {
    let serviceAccount: admin.ServiceAccount & { project_id?: string };
    try {
      const json = Buffer.from(serviceAccountBase64, "base64").toString("utf8");
      serviceAccount = JSON.parse(json);
    } catch (err) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_BASE64 could not be decoded/parsed. Make sure it's the base64 " +
          "of the FULL service account JSON file, with no surrounding quotes or line breaks."
      );
    }
    const resolvedProjectId = serviceAccount.projectId || serviceAccount.project_id;
    if (!resolvedProjectId) {
      throw new Error("Decoded service account JSON has no project_id field.");
    }
    return { credential: admin.credential.cert(serviceAccount), projectId: resolvedProjectId };
  }

  // Fallback: the older three-separate-variables method. Kept for backward
  // compatibility, but prefer FIREBASE_SERVICE_ACCOUNT_BASE64 above — it's
  // far less error-prone.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (recommended), " +
        "or all three of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  return { credential: admin.credential.cert({ projectId, clientEmail, privateKey }), projectId };
}

// --- Crash-proof initialization -------------------------------------------
// A bad/missing credential must NEVER take down the whole Node process.
// Previously, a throw here happened at module-load time, which crashed the
// server before Express could even start listening — Render then shows a
// bare 502 with zero information. Instead: try once at startup, remember
// the failure if any, and let the server keep running. Every route that
// actually needs Firebase will then fail with a clear, readable error
// message instead of the whole app going dark.
let initError: string | null = null;
let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;
let _backendProjectId: string | null = null;

try {
  const { credential, projectId } = loadCredential();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential,
      // No storageBucket here on purpose — this project does not use
      // Firebase Storage. Car photos are compressed client-side and stored
      // as base64 strings directly on the Firestore session document.
    });
  }
  _db = admin.firestore();
  _auth = admin.auth();
  _backendProjectId = projectId;
  console.log(`✅ Firebase Admin initialized for project "${projectId}"`);
} catch (err: any) {
  initError = err?.message || String(err);
  console.error("🔥 FIREBASE ADMIN INIT FAILED — server will still start, but every");
  console.error("   request that touches Firebase will return this error until fixed:");
  console.error("  ", initError);
}

/** True once Firebase Admin has successfully initialized. */
export function isFirebaseReady(): boolean {
  return _db !== null && _auth !== null;
}

/** The reason initialization failed, or null if it succeeded. */
export function getFirebaseInitError(): string | null {
  return initError;
}

/** The Firebase project this backend is configured for, once known. */
export function getBackendProjectId(): string | null {
  return _backendProjectId;
}

function makeLazyProxy<T extends object>(getInstance: () => T | null, label: string): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getInstance();
      if (!instance) {
        throw new Error(`${label} is not initialized: ${initError}`);
      }
      const value = (instance as any)[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

// db/auth are proxies: safe to import anywhere, but any actual method call
// on them (e.g. db.collection(...), auth.verifyIdToken(...)) will throw a
// clear error — instead of crashing the process — if init failed.
export const db = makeLazyProxy(() => _db, "Firestore");
export const auth = makeLazyProxy(() => _auth, "Firebase Auth");
export default admin;