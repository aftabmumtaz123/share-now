import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import { connectDB } from "./db";
import { User, Session } from "./models";

const cookieName = "devstak_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
};
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await connectDB();
  await Session.create({ userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 86400000) });
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
}
export async function getCurrentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await connectDB();
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findOne({ _id: session.userId, status: "active" }).select("_id username displayName role connectionCode avatar email bio banner");
  return user;
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
export async function destroySession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: createHash("sha256").update(token).digest("hex") });
  }
  (await cookies()).delete(cookieName);
}
