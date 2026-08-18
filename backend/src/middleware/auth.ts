import { NextFunction, Request, Response } from "express";
import { auth, db } from "../config/firebase";
import { AuthedRequestUser } from "../types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedRequestUser;
    }
  }
}

/**
 * Verifies the Firebase ID token sent in the Authorization header
 * ("Authorization: Bearer <idToken>"), then loads the matching user
 * profile document from Firestore (users/{uid}) so we know their
 * role and which parking lot they belong to.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or malformed Authorization header." });
    }

    const decoded = await auth.verifyIdToken(token);

    const profileSnap = await db.collection("users").doc(decoded.uid).get();
    if (!profileSnap.exists) {
      return res.status(403).json({
        error: "No user profile found. Complete registration before calling the API.",
      });
    }

    const profile = profileSnap.data() as { role: "owner" | "manager"; lotId: string };

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: profile.role,
      lotId: profile.lotId,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/** Restricts a route to lot owners/admins only. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "owner") {
    return res.status(403).json({ error: "Owner/admin access required." });
  }
  next();
}
