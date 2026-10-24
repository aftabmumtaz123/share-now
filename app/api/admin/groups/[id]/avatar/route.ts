import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Group } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { cloudinary, deleteCloudinaryAsset } from "@/lib/cloudinary";

export const runtime = "nodejs";
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  let uploaded: any = null;
  try {
    await requireAdmin();
    const groupId = idSchema.parse(ctx.params.id);
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image first." }, { status: 400 });
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return NextResponse.json({ ok: false, error: "Use a JPG, PNG, or WebP image." }, { status: 415 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Group images must be 5 MB or smaller." }, { status: 413 });
    await connectDB();
    const group = await Group.findById(groupId).select("avatarAssetId");
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    const bytes = Buffer.from(await file.arrayBuffer());
    uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "devstak/group-avatars", transformation: [{ width: 512, height: 512, crop: "fill" }] }, (err, result) => err ? reject(err) : resolve(result));
      stream.end(bytes);
    });
    const result: any = uploaded;
    const oldAssetId = group.avatarAssetId;
    await Group.updateOne({ _id: groupId }, { $set: { avatar: result.secure_url, avatarAssetId: result.public_id } });
    if (oldAssetId && oldAssetId !== result.public_id) { try { await deleteCloudinaryAsset(oldAssetId, "image"); } catch { /* The new image is already saved; old-asset cleanup can be retried separately. */ } }
    return NextResponse.json({ ok: true, avatar: result.secure_url });
  } catch (error) {
    if (uploaded?.public_id) { try { await deleteCloudinaryAsset(uploaded.public_id, "image"); } catch {} }
    const message = error instanceof Error ? error.message : "Could not update group image.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
