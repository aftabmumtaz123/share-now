import mongoose from "mongoose";
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please define MONGODB_URI in .env.local");
type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
declare global { var mongooseCache: Cached | undefined; }
const cached = global.mongooseCache ?? (global.mongooseCache = { conn: null, promise: null });
export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(uri!, { bufferCommands: false });
  cached.conn = await cached.promise;
  return cached.conn;
}
