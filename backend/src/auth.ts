import type express from "express";
import jwt from "jsonwebtoken";

export type AuthUserPayload = {
  userId: number;
  email: string;
};

export type AuthRequest = express.Request & {
  user?: AuthUserPayload;
};

const jwtSecret = process.env.JWT_SECRET || "change-this-secret";

export function signToken(payload: AuthUserPayload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret) as AuthUserPayload;
}

export function getBearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

export function authMiddleware(
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid auth token" });
  }
}
