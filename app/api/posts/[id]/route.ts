import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { z } from "zod";

function publicIdFromCloudinaryUrl(imageUrl: string): string {
  if (!imageUrl.includes("res.cloudinary.com/") || !imageUrl.includes("/upload/")) return "";
  const uploadPath = imageUrl.split("/upload/")[1]?.split(/[?#]/)[0];
  if (!uploadPath) return "";
  const parts = uploadPath.split("/").filter(Boolean);
  // Cloudinary delivery URLs commonly include transformations and a version segment.
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  const assetParts = versionIndex >= 0
    ? parts.slice(versionIndex + 1)
    : parts.filter((part) => !/^(?:c_|q_|f_|w_|h_|g_|dpr_|e_|fl_|ar_|b_)/.test(part) && !part.includes(","));
  if (!assetParts.length) return "";
  const last = assetParts[assetParts.length - 1];
  assetParts[assetParts.length - 1] = last.replace(/\.(?:avif|gif|jpe?g|png|webp|bmp|tiff?)$/i, "");
  const publicId = assetParts.join("/");
  return publicId.startsWith("devstak/posts/") ? publicId : "";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    await connectDB();
    const body = await req.json();
    const parsed = z.object({ text: z.string().trim().max(2000) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Post text must be 2,000 characters or fewer." }, { status: 400 });
    const post = await Post.findOne({ _id: params.id, authorId: me._id });
    if (!post) return NextResponse.json({ ok: false, error: "Post not found or you do not own it." }, { status: 404 });
    if (!parsed.data.text && !post.imageUrl) return NextResponse.json({ ok: false, error: "A post must contain text or an image." }, { status: 400 });
    post.text = parsed.data.text;
    await post.save();
    return NextResponse.json({ ok: true, post: { _id: String(post._id), text: post.text, imageUrl: post.imageUrl, createdAt: post.createdAt } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update post." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    await connectDB();
    const post = await Post.findById(params.id);
    if (!post) return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    if (String(post.authorId) !== String(me._id)) {
      return NextResponse.json({ ok: false, error: "You can only delete your own posts." }, { status: 403 });
    }

    const imageUrl = typeof post.imageUrl === "string" ? post.imageUrl : "";
    const publicId = typeof post.imagePublicId === "string" && post.imagePublicId
      ? post.imagePublicId
      : publicIdFromCloudinaryUrl(imageUrl);

    // Delete the Cloudinary asset first. If Cloudinary fails, keep the database post
    // so the user can retry rather than silently leaving an orphaned image behind.
    if (publicId) {
      const deleted = await deleteCloudinaryAsset(publicId, "image");
      if (!deleted) {
        return NextResponse.json({ ok: false, error: "Could not delete the post image from Cloudinary. The post was kept; please retry." }, { status: 502 });
      }
    } else if (imageUrl.includes("res.cloudinary.com/") && !imageUrl.includes("/devstak/posts/")) {
      return NextResponse.json({ ok: false, error: "Could not safely identify this Cloudinary image. The post was kept so the image is not orphaned." }, { status: 502 });
    }

    await Post.deleteOne({ _id: post._id, authorId: me._id });
    return NextResponse.json({ ok: true, message: "Post and its Cloudinary image were deleted." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not delete post." }, { status: 400 });
  }
}
