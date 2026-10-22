import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message, Conversation, FileAsset } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { canAccessConversation } from "@/lib/permissions";
import { z } from "zod";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    await connectDB();
    const conversation = await canAccessConversation(String(me._id), params.id);
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found or access denied." }, { status: 403 });

    const query = req.nextUrl.searchParams;
    const limit = Math.min(50, Math.max(1, Number(query.get("limit") || 20)));
    const before = query.get("before");
    const filter: Record<string, unknown> = { conversationId: conversation._id, deletedAt: { $exists: false } };
    if (before && mongoose.isValidObjectId(before)) {
      const cursorMessage = await Message.findOne({ _id: before, conversationId: conversation._id }).select("createdAt").lean() as any;
      if (cursorMessage) filter.createdAt = { $lt: cursorMessage.createdAt };
    }

    const found = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).populate("replyTo", "text senderId").populate("senderId", "displayName username avatar").lean() as any[];
    const hasMore = found.length > limit;
    const messages = found.slice(0, limit).reverse().map((m: any) => ({
      ...m, _id: String(m._id), sender: m.senderId && typeof m.senderId === "object" ? { id: String(m.senderId._id), displayName: m.senderId.displayName, username: m.senderId.username, avatar: m.senderId.avatar || "" } : null, senderId: String(m.senderId?._id || m.senderId),
      reactions: (m.reactions || []).map((r: any) => ({ userId: String(r.userId), emoji: r.emoji })),
      replyTo: m.replyTo ? { _id: String(m.replyTo._id), text: m.replyTo.text, senderId: String(m.replyTo.senderId) } : undefined
    }));
    return NextResponse.json({ ok: true, messages, hasMore });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load messages.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const body = z.object({
      text: z.string().trim().max(5000).optional(),
      replyTo: z.string().optional(),
      fileId: z.string().optional()
    }).refine(value => Boolean(value.text) || Boolean(value.fileId), "Write a message or attach a file.").parse(await req.json());
    await connectDB();
    const conversation = await canAccessConversation(String(me._id), params.id);
    if (!conversation) return NextResponse.json({ ok: false, error: "Conversation not found or access denied." }, { status: 403 });

    let replyTo: mongoose.Types.ObjectId | undefined;
    if (body.replyTo) {
      if (!mongoose.isValidObjectId(body.replyTo)) return NextResponse.json({ ok: false, error: "Invalid reply target." }, { status: 400 });
      const target = await Message.findOne({ _id: body.replyTo, conversationId: conversation._id, deletedAt: { $exists: false } }).select("_id");
      if (!target) return NextResponse.json({ ok: false, error: "The message you are replying to is unavailable." }, { status: 400 });
      replyTo = target._id as mongoose.Types.ObjectId;
    }

    let attachment: any = null;
    if (body.fileId) {
      if (!mongoose.isValidObjectId(body.fileId)) return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
      const asset = await FileAsset.findOne({ _id: body.fileId, uploaderId: me._id, conversationId: conversation._id, status: "active" }).lean() as any;
      if (!asset) return NextResponse.json({ ok: false, error: "Uploaded file was not found for this conversation." }, { status: 404 });
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const deliveryType = asset.resourceType === "raw" ? "raw" : asset.resourceType;
      const url = `https://res.cloudinary.com/${cloudName}/${deliveryType}/upload/${asset.cloudinaryPublicId}`;
      attachment = { fileId: asset._id, url, name: asset.originalFilename, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, resourceType: asset.resourceType };
    }

    const preview = body.text || (attachment ? `File: ${attachment.name}` : "Attachment");
    const message = await Message.create({
      conversationId: conversation._id, senderId: me._id,
      messageType: attachment ? "attachment" : "text", text: body.text || "",
      ...(attachment ? { attachments: [attachment] } : {}), ...(replyTo ? { replyTo } : {})
    });
    if (attachment) await FileAsset.updateOne({ _id: attachment.fileId }, { $set: { messageId: message._id } });
    await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessage: preview.slice(0, 120), lastMessageAt: new Date() } });
    const saved = await Message.findById(message._id).populate("replyTo", "text senderId").lean() as any;
    return NextResponse.json({
      ok: true,
      message: {
        _id: String(saved._id), text: saved.text, senderId: String(saved.senderId), messageType: saved.messageType,
        attachments: saved.attachments, createdAt: saved.createdAt, editedAt: saved.editedAt, reactions: (saved.reactions || []).map((r: any) => ({ userId: String(r.userId), emoji: r.emoji })),
        replyTo: saved.replyTo ? { _id: String(saved.replyTo._id), text: saved.replyTo.text, senderId: String(saved.replyTo.senderId) } : undefined
      }
    }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send message.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
