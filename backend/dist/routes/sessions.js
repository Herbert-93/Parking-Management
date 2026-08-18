"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const firebase_1 = require("../config/firebase");
const auth_1 = require("../middleware/auth");
const pricing_1 = require("../utils/pricing");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
function sessionsCol(lotId) {
    return firebase_1.db.collection("lots").doc(lotId).collection("sessions");
}
// Firestore documents are capped at 1 MiB total. We cap the base64 photo
// string well under that (~700KB) to leave headroom for the rest of the
// document and Firestore's own storage overhead. The mobile app already
// compresses photos before sending, so this should rarely trip.
const MAX_PHOTO_BASE64_LENGTH = 700000;
const entrySchema = zod_1.z.object({
    plateNumber: zod_1.z.string().min(2).max(20),
    photoBase64: zod_1.z
        .string()
        .max(MAX_PHOTO_BASE64_LENGTH, "Photo is too large — please retake it.")
        .startsWith("data:image/", "Photo must be a data URI (data:image/...).")
        .nullable()
        .optional(),
    rateId: zod_1.z.string().min(1),
    notes: zod_1.z.string().max(500).optional(),
});
/**
 * POST /api/sessions  — "log a car in"
 * `photoBase64` is a compressed JPEG the mobile app has already encoded
 * as a data URI (data:image/jpeg;base64,....). It's stored directly on
 * the Firestore session document — no separate file storage involved.
 */
router.post("/", async (req, res) => {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { plateNumber, photoBase64, rateId, notes } = parsed.data;
    const lotId = req.user.lotId;
    const rateSnap = await firebase_1.db.collection("lots").doc(lotId).collection("rates").doc(rateId).get();
    if (!rateSnap.exists) {
        return res.status(404).json({ error: "Selected rate plan does not exist." });
    }
    const rate = rateSnap.data();
    // Guard against double-logging the same plate while it's already parked.
    const dup = await sessionsCol(lotId)
        .where("plateNumber", "==", plateNumber.toUpperCase().trim())
        .where("status", "==", "active")
        .limit(1)
        .get();
    if (!dup.empty) {
        return res.status(409).json({ error: "This plate number is already logged in as parked." });
    }
    const entryTime = new Date();
    const expectedExitTime = new Date(entryTime.getTime() + rate.durationHours * 60 * 60 * 1000);
    const ref = sessionsCol(lotId).doc();
    const session = {
        id: ref.id,
        lotId,
        plateNumber: plateNumber.toUpperCase().trim(),
        photoBase64: photoBase64 || null,
        rateId,
        rateLabel: rate.label,
        ratePrice: rate.price,
        durationHours: rate.durationHours,
        entryTime,
        expectedExitTime,
        exitTime: null,
        status: "active",
        finalCost: null,
        overageHours: null,
        overageCost: null,
        createdBy: req.user.uid,
        closedBy: null,
        notes: notes || null,
        createdAt: entryTime,
        updatedAt: entryTime,
    };
    await ref.set(session);
    res.status(201).json({ session });
});
/** GET /api/sessions/active — cars currently parked */
router.get("/active", async (req, res) => {
    const snap = await sessionsCol(req.user.lotId)
        .where("status", "==", "active")
        .orderBy("entryTime", "desc")
        .get();
    res.json({ sessions: snap.docs.map((d) => d.data()) });
});
/**
 * GET /api/sessions — full history with optional filters
 * Query params: status=active|completed, from=ISOdate, to=ISOdate, limit=n
 */
router.get("/", async (req, res) => {
    const { status, from, to } = req.query;
    let query = sessionsCol(req.user.lotId);
    if (status === "active" || status === "completed") {
        query = query.where("status", "==", status);
    }
    if (from) {
        query = query.where("entryTime", ">=", new Date(from));
    }
    if (to) {
        query = query.where("entryTime", "<=", new Date(to));
    }
    query = query.orderBy("entryTime", "desc").limit(200);
    const snap = await query.get();
    res.json({ sessions: snap.docs.map((d) => d.data()) });
});
/** GET /api/sessions/:id */
router.get("/:id", async (req, res) => {
    const snap = await sessionsCol(req.user.lotId).doc(req.params.id).get();
    if (!snap.exists)
        return res.status(404).json({ error: "Session not found." });
    res.json({ session: snap.data() });
});
/**
 * POST /api/sessions/:id/exit — "log a car out"
 * Computes the final cost (base rate + any overage for staying past the
 * paid duration) and marks the session completed.
 */
router.post("/:id/exit", async (req, res) => {
    const ref = sessionsCol(req.user.lotId).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
        return res.status(404).json({ error: "Session not found." });
    const data = snap.data();
    if (data.status === "completed") {
        return res.status(409).json({ error: "This car has already been logged out." });
    }
    const exitTime = new Date();
    const entryTime = data.entryTime.toDate();
    const { overageHours, overageCost, finalCost } = (0, pricing_1.calculateFinalCost)({
        ratePrice: data.ratePrice,
        durationHours: data.durationHours,
        entryTimeMs: entryTime.getTime(),
        exitTimeMs: exitTime.getTime(),
    });
    const update = {
        status: "completed",
        exitTime,
        finalCost,
        overageHours,
        overageCost,
        closedBy: req.user.uid,
        updatedAt: exitTime,
    };
    await ref.update(update);
    res.json({ session: { ...data, ...update } });
});
exports.default = router;
