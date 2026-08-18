import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Render (and most host env-var UIs) store newlines as literal "\n" — convert back.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your environment."
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    // No storageBucket here on purpose — this project does not use Firebase
    // Storage. Car photos are compressed client-side and stored as base64
    // strings directly on the Firestore session document instead.
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
