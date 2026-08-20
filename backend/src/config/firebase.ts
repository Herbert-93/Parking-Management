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

const { credential, projectId: resolvedProjectId } = loadCredential();

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    // No storageBucket here on purpose — this project does not use Firebase
    // Storage. Car photos are compressed client-side and stored as base64
    // strings directly on the Firestore session document instead.
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
// The project this backend is actually configured for, resolved correctly
// regardless of which credential method (base64 or three separate vars)
// was used — safe to rely on this instead of reading FIREBASE_PROJECT_ID
// directly, since that variable may not be set when using the base64 method.
export const backendProjectId = resolvedProjectId;
export default admin;