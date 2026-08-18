import { Router } from "express";
import { db } from "../config/firebase";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/stats/summary
 * Quick dashboard numbers: cars currently parked, today's completed
 * sessions, and today's revenue.
 */
router.get("/summary", async (req, res) => {
  const lotId = req.user!.lotId;
  const col = db.collection("lots").doc(lotId).collection("sessions");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeSnap, todaySnap] = await Promise.all([
    col.where("status", "==", "active").get(),
    col.where("entryTime", ">=", startOfDay).get(),
  ]);

  let todayRevenue = 0;
  let todayCompleted = 0;
  todaySnap.docs.forEach((d) => {
    const s = d.data();
    if (s.status === "completed" && typeof s.finalCost === "number") {
      todayRevenue += s.finalCost;
      todayCompleted += 1;
    }
  });

  res.json({
    currentlyParked: activeSnap.size,
    todayEntries: todaySnap.size,
    todayCompleted,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
  });
});

export default router;
