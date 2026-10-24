import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a logo image." }, { status: 400 });
    if (!new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]).has(file.type)) return NextResponse.json({ error: "Use PNG, JPG, WebP or SVG." }, { status: 415 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Logo must be 3 MB or smaller." }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "devstak/branding", transformation: [{ width: 600, height: 240, crop: "limit" }] }, (error, result) => error ? reject(error) : resolve(result));
      stream.end(bytes);
    });
    return NextResponse.json({ url: uploaded.secure_url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logo upload failed.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}
