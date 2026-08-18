"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Render (and most host env-var UIs) store newlines as literal "\n" — convert back.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your environment.");
}
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
        // No storageBucket here on purpose — this project does not use Firebase
        // Storage. Car photos are compressed client-side and stored as base64
        // strings directly on the Firestore session document instead.
    });
}
exports.db = firebase_admin_1.default.firestore();
exports.auth = firebase_admin_1.default.auth();
exports.default = firebase_admin_1.default;
