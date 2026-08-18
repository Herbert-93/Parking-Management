"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const firebase_1 = require("../config/firebase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
/** GET /api/rates - list active rate plans for the caller's lot */
router.get("/", async (req, res) => {
    const snap = await firebase_1.db
        .collection("lots")
        .doc(req.user.lotId)
        .collection("rates")
        .where("active", "==", true)
        .orderBy("durationHours", "asc")
        .get();
    res.json({ rates: snap.docs.map((d) => d.data()) });
});
const rateSchema = zod_1.z.object({
    label: zod_1.z.string().min(1),
    durationHours: zod_1.z.number().positive(),
    price: zod_1.z.number().nonnegative(),
});
/** POST /api/rates - create a new rate plan (owner only) */
router.post("/", auth_1.requireOwner, async (req, res) => {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const ref = firebase_1.db.collection("lots").doc(req.user.lotId).collection("rates").doc();
    const rate = {
        id: ref.id,
        lotId: req.user.lotId,
        ...parsed.data,
        active: true,
        createdAt: new Date(),
    };
    await ref.set(rate);
    res.status(201).json({ rate });
});
/** PUT /api/rates/:id - update a rate plan (owner only) */
router.put("/:id", auth_1.requireOwner, async (req, res) => {
    const parsed = rateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const ref = firebase_1.db.collection("lots").doc(req.user.lotId).collection("rates").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
        return res.status(404).json({ error: "Rate not found." });
    await ref.update({ ...parsed.data });
    res.json({ rate: { ...snap.data(), ...parsed.data } });
});
/** DELETE /api/rates/:id - soft-delete (deactivate) a rate plan (owner only) */
router.delete("/:id", auth_1.requireOwner, async (req, res) => {
    const ref = firebase_1.db.collection("lots").doc(req.user.lotId).collection("rates").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
        return res.status(404).json({ error: "Rate not found." });
    await ref.update({ active: false });
    res.status(204).send();
});
exports.default = router;
