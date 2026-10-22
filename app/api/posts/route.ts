import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Post, Connection, User } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { cloudinary } from "@/lib/cloudinary";

export async function GET() {
  try {
    const me = await requireUser(); await connectDB();
    const accepted = await Connection.find({ status: "accepted", $or: [{ requester: me._id }, { recipient: me._id }] }).select("requester recipient").lean();
    const ids = new Set<string>([String(me._id)]);
    accepted.forEach((c:any) => { ids.add(String(c.requester)); ids.add(String(c.recipient)); });
    const posts = await Post.find({ authorId: { $in: [...ids] } }).sort({ createdAt: -1 }).limit(50).populate("authorId", "displayName username avatar").populate("comments.userId", "displayName username avatar").lean();
    return NextResponse.json({ ok: true, posts: posts.map((p:any)=>({...p,_id:String(p._id),author:{...p.authorId,_id:String(p.authorId._id)},likes:(p.likes||[]).map(String),comments:(p.comments||[]).map((c:any)=>({...c,_id:String(c._id),user:{...c.userId,_id:String(c.userId._id)}}))})) });
  } catch(e) { return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Could not load posts"},{status:401}); }
}
export async function POST(req: NextRequest) {
  let uploaded: any = null;
  try {
    const me = await requireUser();
    await connectDB();

    let text = "";
    let imageUrl = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      text = String(form.get("text") || "").trim();
      const file = form.get("image");
      if (file instanceof File && file.size > 0) {
        const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (!allowed.has(file.type)) {
          return NextResponse.json({ ok: false, error: "Choose a JPG, PNG, or WebP image." }, { status: 415 });
        }
        if (file.size > 8 * 1024 * 1024) {
          return NextResponse.json({ ok: false, error: "Post images must be 8 MB or smaller." }, { status: 413 });
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image", folder: "devstak/posts", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] },
            (error, result) => error ? reject(error) : resolve(result)
          );
          stream.end(bytes);
        });
        imageUrl = (uploaded as any).secure_url;
      } else if (file && !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "Invalid image upload." }, { status: 400 });
      }
    } else {
      const body = await req.json();
      text = z.string().trim().max(2000).parse(body.text || "");
      imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    }

    if (text.length > 2000) {
      return NextResponse.json({ ok: false, error: "Posts must be 2,000 characters or fewer." }, { status: 400 });
    }
    if (!text && !imageUrl) {
      return NextResponse.json({ ok: false, error: "Write something or add an image before publishing." }, { status: 400 });
    }

    const post = await Post.create({ authorId: me._id, text, imageUrl });
    return NextResponse.json({ ok: true, post: { _id: String(post._id), text: post.text, imageUrl: post.imageUrl, createdAt: post.createdAt, author: { _id: String(me._id), displayName: me.displayName, username: me.username, avatar: me.avatar }, likes: [], comments: [] } }, { status: 201 });
  } catch (e) {
    if (uploaded?.public_id) {
      try { await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "image", invalidate: true }); } catch { /* ignore cleanup failure */ }
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not create post" }, { status: 400 });
  }
}
