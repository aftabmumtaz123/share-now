import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export async function PATCH(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = z.object({ displayName: z.string().trim().min(2).max(80), bio: z.string().trim().max(300).default("") }).parse(await req.json());
    await connectDB();
    const user = await User.findByIdAndUpdate(me._id, { $set: { displayName: body.displayName, bio: body.bio } }, { new: true }).select("displayName bio username avatar banner").lean() as any;
    if (!user) return NextResponse.json({ ok:false, error:"User not found." }, { status:404 });
    return NextResponse.json({ ok:true, profile: { displayName:user.displayName, bio:user.bio || "", username:user.username, avatar:user.avatar || "", banner:user.banner || "" } });
  } catch (error) { const message = error instanceof Error ? error.message : "Could not save profile."; return NextResponse.json({ok:false,error:message},{status:message === "UNAUTHORIZED" ? 401 : 400}); }
}
