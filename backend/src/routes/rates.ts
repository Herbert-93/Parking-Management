import { Router } from "express";
import { z } from "zod";
import { db } from "../config/firebase";
import { requireAuth, requireOwner } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

/** GET /api/rates - list active rate plans for the caller's lot */
router.get("/", async (req, res) => {
  const snap = await db
    .collection("lots")
    .doc(req.user!.lotId)
    .collection("rates")
    .where("active", "==", true)
    .orderBy("durationHours", "asc")
    .get();

  res.json({ rates: snap.docs.map((d) => d.data()) });
});

const rateSchema = z.object({
  label: z.string().min(1),
  durationHours: z.number().positive(),
  price: z.number().nonnegative(),
});

/** POST /api/rates - create a new rate plan (owner only) */
router.post("/", requireOwner, async (req, res) => {
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const ref = db.collection("lots").doc(req.user!.lotId).collection("rates").doc();
  const rate = {
    id: ref.id,
    lotId: req.user!.lotId,
    ...parsed.data,
    active: true,
    createdAt: new Date(),
  };
  await ref.set(rate);
  res.status(201).json({ rate });
});

/** PUT /api/rates/:id - update a rate plan (owner only) */
router.put("/:id", requireOwner, async (req, res) => {
  const parsed = rateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const ref = db.collection("lots").doc(req.user!.lotId).collection("rates").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Rate not found." });

  await ref.update({ ...parsed.data });
  res.json({ rate: { ...snap.data(), ...parsed.data } });
});

/** DELETE /api/rates/:id - soft-delete (deactivate) a rate plan (owner only) */
router.delete("/:id", requireOwner, async (req, res) => {
  const ref = db.collection("lots").doc(req.user!.lotId).collection("rates").doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: "Rate not found." });

  await ref.update({ active: false });
  res.status(204).send();
});

export default router;
