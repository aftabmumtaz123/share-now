import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { cloudinary, deleteCloudinaryAsset } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let uploaded: any = null;
  try {
    const me = await requireUser();
    const form = await req.formData();
    const kind = form.get("kind") === "banner" ? "banner" : "avatar";
    const file = form.get("image") || form.get("avatar");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image first." }, { status: 400 });
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) return NextResponse.json({ ok: false, error: "Use a JPG, PNG, or WebP image." }, { status: 415 });
    if (file.size > (kind === "banner" ? 8 : 5) * 1024 * 1024) return NextResponse.json({ ok: false, error: kind === "banner" ? "Banner images must be 8 MB or smaller." : "Profile pictures must be 5 MB or smaller." }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: kind === "banner" ? "devstak/banners" : "devstak/avatars", transformation: kind === "banner" ? [{ width: 1600, height: 500, crop: "fill" }] : [{ width: 512, height: 512, crop: "fill", gravity: "face" }] }, (err, result) => err ? reject(err) : resolve(result));
      stream.end(bytes);
    });
    const result: any = uploaded;
    await connectDB();
    const fresh = await User.findById(me._id).select(kind === "banner" ? "bannerAssetId" : "avatarAssetId").lean() as any;
    const assetField = kind === "banner" ? "bannerAssetId" : "avatarAssetId";
    const urlField = kind === "banner" ? "banner" : "avatar";
    await User.updateOne({ _id: me._id }, { $set: { [urlField]: result.secure_url, [assetField]: result.public_id } });
    if (fresh?.[assetField] && fresh[assetField] !== result.public_id) {
      try { await deleteCloudinaryAsset(fresh[assetField], "image"); } catch { /* Keep the new image even if old-asset cleanup fails. */ }
    }
    return NextResponse.json({ ok: true, [urlField]: result.secure_url });
  } catch (error) {
    if (uploaded?.public_id) { try { await deleteCloudinaryAsset(uploaded.public_id, "image"); } catch {} }
    const message = error instanceof Error ? error.message : "Could not update profile picture.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
