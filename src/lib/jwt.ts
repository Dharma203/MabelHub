import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";

export type SessionPayload = {
  userId: string;
  role: "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES" | "ADMIN SALES" ;
  username: string;
  fullName: string;
};

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
