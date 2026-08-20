import { Router } from "express";
import { z } from "zod";
import { db } from "../config/firebase";
import { requireAuth } from "../middleware/auth";
import { calculateFinalCost } from "../utils/pricing";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(requireAuth);

function sessionsCol(lotId: string) {
  return db.collection("lots").doc(lotId).collection("sessions");
}

function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}

/** Sorts a list of plain session docs by entryTime, newest first — done in
 * JS instead of a Firestore .orderBy() so no composite index is required. */
function sortByEntryTimeDesc<T extends { entryTime: any }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => toMillis(b.entryTime) - toMillis(a.entryTime));
}

// Firestore documents are capped at 1 MiB total. We cap the base64 photo
// string well under that (~700KB) to leave headroom for the rest of the
// document and Firestore's own storage overhead. The mobile app already
// compresses photos before sending, so this should rarely trip.
const MAX_PHOTO_BASE64_LENGTH = 700_000;

const entrySchema = z.object({
  plateNumber: z.string().min(2).max(20),
  photoBase64: z
    .string()
    .max(MAX_PHOTO_BASE64_LENGTH, "Photo is too large — please retake it.")
    .startsWith("data:image/", "Photo must be a data URI (data:image/...).")
    .nullable()
    .optional(),
  // Entered directly by the attendant at the moment of logging a car in —
  // no pre-configured "rate plan" needs to exist for this to work.
  durationHours: z.number().positive().max(24 * 14, "Duration looks too long — check the hours."),
  price: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/sessions  — "log a car in"
 * `photoBase64` is a compressed JPEG the mobile app has already encoded
 * as a data URI (data:image/jpeg;base64,....). It's stored directly on
 * the Firestore session document — no separate file storage involved.
 *
 * `durationHours` and `price` are typed in by the attendant on the mobile
 * app itself (with quick-tap presets built into the app UI) — there is no
 * server-side "rate plan" the owner has to configure first.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { plateNumber, photoBase64, durationHours, price, notes } = parsed.data;
    const lotId = req.user!.lotId;

    // Guard against double-logging the same plate while it's already parked.
    // Two equality filters on different fields — no composite index needed.
    const dup = await sessionsCol(lotId)
      .where("plateNumber", "==", plateNumber.toUpperCase().trim())
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (!dup.empty) {
      return res.status(409).json({ error: "This plate number is already logged in as parked." });
    }

    const entryTime = new Date();
    const expectedExitTime = new Date(entryTime.getTime() + durationHours * 60 * 60 * 1000);
    const hourLabel = `${durationHours}h`;

    const ref = sessionsCol(lotId).doc();
    const session = {
      id: ref.id,
      lotId,
      plateNumber: plateNumber.toUpperCase().trim(),
      photoBase64: photoBase64 || null,
      rateLabel: `${hourLabel} flat rate`,
      ratePrice: price,
      durationHours,
      entryTime,
      expectedExitTime,
      exitTime: null,
      status: "active" as const,
      finalCost: null,
      overageHours: null,
      overageCost: null,
      createdBy: req.user!.uid,
      closedBy: null,
      notes: notes || null,
      createdAt: entryTime,
      updatedAt: entryTime,
    };

    await ref.set(session);
    res.status(201).json({ session });
  })
);

/**
 * GET /api/sessions/active — cars currently parked
 * Sorted in JS (not via Firestore .orderBy) so this never needs a
 * composite index on (status, entryTime).
 */
router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const snap = await sessionsCol(req.user!.lotId).where("status", "==", "active").get();
    const sessions = sortByEntryTimeDesc(snap.docs.map((d) => d.data() as any));
    res.json({ sessions });
  })
);

/**
 * GET /api/sessions — full history with optional filters
 * Query params: status=active|completed, from=ISOdate, to=ISOdate
 * Sorted in JS for the same reason as /active above.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, from, to } = req.query as Record<string, string | undefined>;
    let query: FirebaseFirestore.Query = sessionsCol(req.user!.lotId);

    if (status === "active" || status === "completed") {
      query = query.where("status", "==", status);
    }
    if (from) {
      query = query.where("entryTime", ">=", new Date(from));
    }
    if (to) {
      query = query.where("entryTime", "<=", new Date(to));
    }

    // Fetch a generous batch (no server-side order/limit needed), sort in
    // JS, then cap to the most recent 200 — avoids requiring any composite
    // Firestore index for this filter combination.
    const snap = await query.limit(1000).get();
    const sessions = sortByEntryTimeDesc(snap.docs.map((d) => d.data() as any)).slice(0, 200);
    res.json({ sessions });
  })
);

/** GET /api/sessions/:id */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const snap = await sessionsCol(req.user!.lotId).doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Session not found." });
    res.json({ session: snap.data() });
  })
);

/**
 * POST /api/sessions/:id/exit — "log a car out"
 * Computes the final cost (base rate + any overage for staying past the
 * paid duration) and marks the session completed.
 */
router.post(
  "/:id/exit",
  asyncHandler(async (req, res) => {
    const ref = sessionsCol(req.user!.lotId).doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Session not found." });

    const data = snap.data()!;
    if (data.status === "completed") {
      return res.status(409).json({ error: "This car has already been logged out." });
    }

    const exitTime = new Date();
    const entryTime: Date = data.entryTime.toDate();

    const { overageHours, overageCost, finalCost } = calculateFinalCost({
      ratePrice: data.ratePrice,
      durationHours: data.durationHours,
      entryTimeMs: entryTime.getTime(),
      exitTimeMs: exitTime.getTime(),
    });

    const update = {
      status: "completed" as const,
      exitTime,
      finalCost,
      overageHours,
      overageCost,
      closedBy: req.user!.uid,
      updatedAt: exitTime,
    };

    await ref.update(update);
    res.json({ session: { ...data, ...update } });
  })
);

export default router;