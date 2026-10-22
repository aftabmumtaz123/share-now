import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    await connectDB();

    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }
    if (String(post.authorId) !== String(me._id)) {
      return NextResponse.json({ ok: false, error: "You can only delete your own posts." }, { status: 403 });
    }

    // Delete the database record first; image cleanup is best-effort so a Cloudinary
    // hiccup cannot leave a post visible after the owner deletes it.
    const imageUrl = typeof post.imageUrl === "string" ? post.imageUrl : "";
    await Post.deleteOne({ _id: post._id, authorId: me._id });

    if (imageUrl.includes("res.cloudinary.com/")) {
      try {
        const afterUpload = imageUrl.split("/upload/")[1];
        if (afterUpload) {
          const withoutVersion = afterUpload.replace(/^v\d+\//, "");
          const withoutTransforms = withoutVersion.split("/").filter((part) => !part.includes(",") && !part.startsWith("c_") && !part.startsWith("q_") && !part.startsWith("f_")).join("/");
          const publicId = withoutTransforms.replace(/\.[^.]+$/, "");
          if (publicId && publicId.startsWith("devstak/posts/")) {
            await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
          }
        }
      } catch {
        // The post is already deleted. An orphaned image can be cleaned up later.
      }
    }

    return NextResponse.json({ ok: true, message: "Post deleted." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete post." },
      { status: 400 },
    );
  }
}
