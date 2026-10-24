import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Schema, models, model } from "mongoose";

const ThemeSchema = new Schema({ key: { type: String, unique: true }, settings: { type: Schema.Types.Mixed, default: {} } }, { timestamps: true });
const ThemeSetting = models.ThemeSetting || model("ThemeSetting", ThemeSchema);
const defaults = { accent: "#635bff", background: "#f4f7fb", surface: "#ffffff", layout: "spacious", radius: "rounded", font: "modern", logoUrl: "", brandName: "DevStak" };
export async function GET() {
  try { await connectDB(); const doc = await ThemeSetting.findOne({ key: "global" }).lean() as any; return NextResponse.json({ theme: { ...defaults, ...(doc?.settings || {}) } }); }
  catch { return NextResponse.json({ theme: defaults }); }
}
export async function PATCH(request: Request) {
  try { await requireAdmin(); await connectDB(); const body = await request.json();
    const allowed = { accent: /^#[0-9a-fA-F]{6}$/, background: /^#[0-9a-fA-F]{6}$/, surface: /^#[0-9a-fA-F]{6}$/, layout: /^(spacious|compact|wide)$/, radius: /^(rounded|soft|sharp)$/, font: /^(modern|classic)$/ };
    const next: Record<string,string> = {};
    if (body.logoUrl !== undefined) { if (typeof body.logoUrl !== "string" || (body.logoUrl !== "" && (!body.logoUrl.startsWith("https://") || body.logoUrl.length > 2048))) return NextResponse.json({ error: "Invalid logo URL." }, { status: 400 }); next.logoUrl = body.logoUrl; }
    if (body.brandName !== undefined) { if (typeof body.brandName !== "string" || body.brandName.trim().length < 1 || body.brandName.trim().length > 40) return NextResponse.json({ error: "Brand name must be 1–40 characters." }, { status: 400 }); next.brandName = body.brandName.trim(); }
    for (const key of Object.keys(allowed) as (keyof typeof allowed)[]) { if (body[key] !== undefined) { if (typeof body[key] !== "string" || !allowed[key].test(body[key])) return NextResponse.json({ error: `Invalid ${key} value.` }, { status: 400 }); next[key] = body[key]; } }
    const doc = await ThemeSetting.findOneAndUpdate({ key: "global" }, { $set: { settings: { ...defaults, ...next } }, $setOnInsert: { key: "global" } }, { upsert: true, new: true });
    return NextResponse.json({ theme: { ...defaults, ...(doc.settings || {}) } });
  } catch (e) { const message = e instanceof Error ? e.message : "Could not save theme."; return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 }); }
}
