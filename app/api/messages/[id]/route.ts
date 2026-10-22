import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { canAccessConversation } from "@/lib/permissions";
import { z } from "zod";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ ok: false, error: "Invalid message." }, { status: 400 });
    await connectDB();
    const message = await Message.findById(params.id);
    if (!message || message.deletedAt) return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 });
    const conversation = await canAccessConversation(String(me._id), String(message.conversationId));
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found or access denied." }, { status: 403 });
    if (String(message.senderId) !== String(me._id)) return NextResponse.json({ ok: false, error: "You can only delete your own messages." }, { status: 403 });
    message.deletedAt = new Date();
    message.text = "";
    await message.save();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not delete message.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}


export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ ok: false, error: "Invalid message." }, { status: 400 });
    const body = await req.json();
    await connectDB();
    const message = await Message.findById(params.id);
    if (!message || message.deletedAt) return NextResponse.json({ ok: false, error: "Message not found." }, { status: 404 });
    const conversation = await canAccessConversation(String(me._id), String(message.conversationId));
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found or access denied." }, { status: 403 });

    if (body.action === "edit") {
      if (String(message.senderId) !== String(me._id)) return NextResponse.json({ ok: false, error: "You can only edit your own messages." }, { status: 403 });
      if (message.messageType !== "text") return NextResponse.json({ ok: false, error: "Only text messages can be edited." }, { status: 400 });
      const parsed = z.string().trim().min(1).max(5000).safeParse(body.text);
      if (!parsed.success) return NextResponse.json({ ok: false, error: "Message text must be between 1 and 5000 characters." }, { status: 400 });
      message.text = parsed.data;
      message.editedAt = new Date();
      await message.save();
      return NextResponse.json({ ok: true, message: { _id: String(message._id), text: message.text, editedAt: message.editedAt } });
    }

    if (body.action === "react") {
      const allowed = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
      if (typeof body.emoji !== "string" || !allowed.includes(body.emoji)) return NextResponse.json({ ok: false, error: "Unsupported reaction." }, { status: 400 });
      const existing = (message as any).reactions.find((r: any) => String(r.userId) === String(me._id) && r.emoji === body.emoji);
      if (existing) (message as any).reactions = (message as any).reactions.filter((r: any) => !(String(r.userId) === String(me._id) && r.emoji === body.emoji));
      else (message as any).reactions.push({ userId: me._id, emoji: body.emoji });
      await message.save();
      return NextResponse.json({ ok: true, reactions: (message as any).reactions.map((r: any) => ({ userId: String(r.userId), emoji: r.emoji })) });
    }
    return NextResponse.json({ ok: false, error: "Unsupported message action." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not update message.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
