import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Post, Connection, User } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

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
  try {
    const me = await requireUser(); await connectDB();
    const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(await req.json());
    const post = await Post.create({ authorId: me._id, text });
    return NextResponse.json({ok:true,post:{_id:String(post._id),text:post.text,createdAt:post.createdAt,author:{_id:String(me._id),displayName:me.displayName,username:me.username,avatar:me.avatar},likes:[],comments:[]}},{status:201});
  } catch(e) { return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Could not create post"},{status:400}); }
}
