"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireOwner = requireOwner;
const firebase_1 = require("../config/firebase");
/**
 * Verifies the Firebase ID token sent in the Authorization header
 * ("Authorization: Bearer <idToken>"), then loads the matching user
 * profile document from Firestore (users/{uid}) so we know their
 * role and which parking lot they belong to.
 */
async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ error: "Missing or malformed Authorization header." });
        }
        const decoded = await firebase_1.auth.verifyIdToken(token);
        const profileSnap = await firebase_1.db.collection("users").doc(decoded.uid).get();
        if (!profileSnap.exists) {
            return res.status(403).json({
                error: "No user profile found. Complete registration before calling the API.",
            });
        }
        const profile = profileSnap.data();
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: profile.role,
            lotId: profile.lotId,
        };
        next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ error: "Invalid or expired token." });
    }
}
/** Restricts a route to lot owners/admins only. */
function requireOwner(req, res, next) {
    if (req.user?.role !== "owner") {
        return res.status(403).json({ error: "Owner/admin access required." });
    }
    next();
}
