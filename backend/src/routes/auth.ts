import { Router } from "express";
import { z } from "zod";
import { db, auth as fbAuth, backendProjectId } from "../config/firebase";
import { requireAuth } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  lotName: z.string().min(2).optional(),
  // If joining an existing lot as a manager, pass the lot's id.
  // If omitted, a brand new parking lot is created and the caller becomes its owner.
  lotId: z.string().optional(),
});

/**
 * POST /api/auth/register-profile
 * Called ONCE right after the client has already created the Firebase Auth
 * account (via createUserWithEmailAndPassword on the client). This endpoint
 * Lightweight version that only verifies the Firebase ID token (does NOT
 * require an existing profile), then creates the lot + user profile.
 */
router.post("/register-profile", async (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing Authorization header." });
  }

  let decoded;
  try {
    decoded = await fbAuth.verifyIdToken(token);
  } catch (err: any) {
    console.error("register-profile token verify error:", err);
    const code = err?.code || "unknown";
    return res.status(401).json({
      error: `Invalid or expired token. [${code}] ${err?.message || String(err)}`,
    });
  }

  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { name, lotName, lotId } = parsed.data;

    const existing = await db.collection("users").doc(decoded.uid).get();
    if (existing.exists) {
      return res.status(200).json({ profile: existing.data() });
    }

    let finalLotId = lotId;
    let role: "owner" | "manager" = "manager";

    if (!finalLotId) {
      // No lot specified -> this person is creating (and owns) a new lot.
      const lotRef = db.collection("lots").doc();
      await lotRef.set({
        id: lotRef.id,
        name: lotName || `${name}'s Parking Lot`,
        ownerUid: decoded.uid,
        createdAt: new Date(),
      });
      finalLotId = lotRef.id;
      role = "owner";
    } else {
      const lotSnap = await db.collection("lots").doc(finalLotId).get();
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

    await db.collection("users").doc(decoded.uid).set(profile);

    res.status(201).json({ profile });
  } catch (err: any) {
    console.error("register-profile error:", err);
    res.status(500).json({ error: `Failed to register profile: ${err?.message || String(err)}` });
  }
});

/**
 * GET /api/auth/debug-token
 * Diagnostic-only route: does NOT require a working profile or even a
 * verifiable token. Decodes whatever Bearer token is sent (without
 * verifying it) to show which Firebase project issued it, compares that
 * against the Firebase project this backend is configured for, and
 * separately reports whether full verification succeeds.
 *
 * This exists to make one specific, very common deployment mistake
 * instantly visible: the mobile app / admin panel pointing at a DIFFERENT
 * Firebase project than the one the backend's service account belongs to.
 * When that happens, tokens look completely valid to the client but the
 * backend can never verify them — every request fails with the same
 * generic "invalid token" error, which is otherwise very hard to diagnose
 * from the outside.
 *
 * Safe to leave in: it reveals project IDs (not secret) and whether
 * verification passed — never any key material or user data.
 */
router.get("/debug-token", async (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(400).json({
      error: "Send a Bearer token to inspect, e.g. Authorization: Bearer <idToken>.",
    });
  }

  let payload: any = null;
  try {
    const payloadB64 = token.split(".")[1];
    const json = Buffer.from(payloadB64, "base64").toString("utf8");
    payload = JSON.parse(json);
  } catch {
    return res.status(400).json({ error: "Could not decode this token — it isn't a valid JWT." });
  }

  let verifyError: string | null = null;
  let verifiedUid: string | null = null;
  try {
    const decoded = await fbAuth.verifyIdToken(token);
    verifiedUid = decoded.uid;
  } catch (err: any) {
    verifyError = `[${err?.code || "unknown"}] ${err?.message || String(err)}`;
  }

  const backendProjectId2 = backendProjectId; // resolved correctly for both credential methods
  const tokenProjectId = payload.aud || null;

  res.json({
    tokenProjectId,
    backendProjectId: backendProjectId2,
    projectIdsMatch: !!tokenProjectId && tokenProjectId === backendProjectId2,
    tokenIssuer: payload.iss || null,
    tokenIssuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
    tokenExpiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    tokenExpired: payload.exp ? Date.now() / 1000 > payload.exp : null,
    fullVerification: verifyError ? "FAILED" : "OK",
    verifyError,
    verifiedUid,
    hint: !tokenProjectId
      ? "Could not read a project id from the token at all."
      : tokenProjectId !== backendProjectId2
      ? `MISMATCH: this token was issued for Firebase project "${tokenProjectId}", but this backend is configured for "${backendProjectId2}". Fix your backend's Firebase credentials to match, or point the client at the "${backendProjectId2}" project instead.`
      : verifyError
      ? "Project IDs match, so this is something else — check the verifyError above (commonly a malformed/corrupted private key, or a genuinely expired token if tokenExpired is true)."
      : "Everything checks out — this token verifies successfully.",
  });
});

/** GET /api/auth/me - returns the caller's profile */
router.get("/me", requireAuth, async (req, res) => {
  const snap = await db.collection("users").doc(req.user!.uid).get();
  res.json({ profile: snap.data() });
});

export default router;