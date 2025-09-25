import { Request, Response, NextFunction } from "express";
import admin from "../src/firebase";

/**
 * Middleware to verify Firebase ID tokens.  Clients must include
 * a bearer token in the `Authorization` header: `Bearer <token>`.
 * If verification succeeds, the decoded token is attached to
 * `req.user` and the request continues.  Otherwise a 401 response
 * is returned.
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    // Attach the decoded token to the request for downstream handlers
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
