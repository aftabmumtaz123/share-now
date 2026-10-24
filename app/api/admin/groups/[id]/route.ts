import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Conversation, Group, GroupActivity, Message, FileAsset } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";

const paramsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(ctx.params);
    await connectDB();
    const group = await Group.findById(id).populate("members", "displayName username avatar status createdAt").populate("moderators", "displayName username avatar").lean();
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    const activity = await GroupActivity.find({ groupId: id }).sort({ createdAt: -1 }).limit(50).populate("actorId", "displayName username").populate("targetUserId", "displayName username").lean();
    return NextResponse.json({ ok: true, group: JSON.parse(JSON.stringify(group)), activity: JSON.parse(JSON.stringify(activity)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load group.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const { id } = paramsSchema.parse(ctx.params);
    const data = updateSchema.parse(await req.json());
    if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: "No changes provided." }, { status: 400 });
    await connectDB();
    const updated = await Group.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    const group = await Group.findById(updated._id).populate("members", "displayName username avatar status createdAt").populate("moderators", "displayName username avatar").lean();
    await GroupActivity.create({ groupId: id, actorId: admin._id, action: data.status ? (data.status === "archived" ? "group.archived" : "group.restored") : "group.updated", details: data.name ? `Group name set to ${data.name}` : data.description !== undefined ? "Group description updated" : "Group settings updated" });
    return NextResponse.json({ ok: true, group: JSON.parse(JSON.stringify(group)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update group.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(ctx.params);
    await connectDB();
    const group = await Group.findById(id).lean();
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    const admin = await requireAdmin();
    // Mongoose lean() can infer a document-or-array union for loosely typed models.
    // findById() returns one record, so narrow the result before accessing its fields.
    const groupRecord = group as any;
    const conversations = await Conversation.find({ type: "group", groupId: groupRecord._id }).select("_id").lean();
    const conversationIds = conversations.map((c: any) => c._id);
    const assets = await FileAsset.find({ conversationId: { $in: conversationIds }, status: { $ne: "deleted" } }).select("_id cloudinaryPublicId resourceType").lean();
    const cleanupErrors: string[] = [];
    if (groupRecord.avatarAssetId) {
      try {
        const removed = await deleteCloudinaryAsset(groupRecord.avatarAssetId, "image");
        if (!removed) cleanupErrors.push("group-avatar");
      } catch { cleanupErrors.push("group-avatar"); }
    }
    for (const asset of assets as any[]) {
      if (asset.cloudinaryPublicId) {
        try {
          const removed = await deleteCloudinaryAsset(asset.cloudinaryPublicId, asset.resourceType || "raw");
          if (!removed) cleanupErrors.push(String(asset._id));
        } catch { cleanupErrors.push(String(asset._id)); }
      }
    }
    if (cleanupErrors.length) return NextResponse.json({ ok: false, error: "Some uploaded files could not be removed from storage. The group was kept; retry after fixing storage configuration." }, { status: 502 });
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await FileAsset.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
    await GroupActivity.create({ groupId: groupRecord._id, actorId: admin._id, action: "group.deleted", details: `Group ${groupRecord.name} permanently deleted` });
    await Group.deleteOne({ _id: groupRecord._id });
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete group.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
