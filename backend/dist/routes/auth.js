"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const firebase_1 = require("../config/firebase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    lotName: zod_1.z.string().min(2).optional(),
    // If joining an existing lot as a manager, pass the lot's id.
    // If omitted, a brand new parking lot is created and the caller becomes its owner.
    lotId: zod_1.z.string().optional(),
});
/**
 * POST /api/auth/register-profile
 * Called ONCE right after the client has already created the Firebase Auth
 * account (via createUserWithEmailAndPassword on the client). This endpoint
 * Lightweight version that only verifies the Firebase ID token (does NOT
 * require an existing profile), then creates the lot + user profile.
 */
router.post("/register-profile", async (req, res) => {
    try {
        const header = req.headers.authorization || "";
        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ error: "Missing Authorization header." });
        }
        const decoded = await firebase_1.auth.verifyIdToken(token);
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { name, lotName, lotId } = parsed.data;
        const existing = await firebase_1.db.collection("users").doc(decoded.uid).get();
        if (existing.exists) {
            return res.status(200).json({ profile: existing.data() });
        }
        let finalLotId = lotId;
        let role = "manager";
        if (!finalLotId) {
            // No lot specified -> this person is creating (and owns) a new lot.
            const lotRef = firebase_1.db.collection("lots").doc();
            await lotRef.set({
                id: lotRef.id,
                name: lotName || `${name}'s Parking Lot`,
                ownerUid: decoded.uid,
                createdAt: new Date(),
            });
            finalLotId = lotRef.id;
            role = "owner";
        }
        else {
            const lotSnap = await firebase_1.db.collection("lots").doc(finalLotId).get();
            if (!lotSnap.exists) {
                return res.status(404).json({ error: "lotId does not exist." });
            }
        }
        const profile = {
            uid: decoded.uid,
            email: decoded.email || "",
            name,
            role,
            lotId: finalLotId,
            createdAt: new Date(),
        };
        await firebase_1.db.collection("users").doc(decoded.uid).set(profile);
        res.status(201).json({ profile });
    }
    catch (err) {
        console.error("register-profile error:", err);
        res.status(500).json({ error: "Failed to register profile." });
    }
});
/** GET /api/auth/me - returns the caller's profile */
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const snap = await firebase_1.db.collection("users").doc(req.user.uid).get();
    res.json({ profile: snap.data() });
});
exports.default = router;
