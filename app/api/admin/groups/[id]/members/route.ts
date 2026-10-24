import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Conversation, Group, GroupActivity, User } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const addSchema = z.object({ userIds: z.array(idSchema).min(1).max(100) });
const removeSchema = z.object({ userId: idSchema });

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const groupId = idSchema.parse(ctx.params.id);
    const { userIds } = addSchema.parse(await req.json());
    await connectDB();
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    if (group.status !== "active") return NextResponse.json({ ok: false, error: "Restore this group before adding members." }, { status: 409 });
    const validUsers = await User.find({ _id: { $in: userIds }, role: "user", status: "active" }).select("_id").lean();
    if (validUsers.length !== new Set(userIds).size) return NextResponse.json({ ok: false, error: "One or more selected users are unavailable." }, { status: 400 });
    const existing = new Set(group.members.map((id: any) => String(id)));
    const toAdd = validUsers.map((u: any) => u._id).filter((id: any) => !existing.has(String(id)));
    if (!toAdd.length) return NextResponse.json({ ok: false, error: "All selected users are already members." }, { status: 409 });
    await Group.updateOne({ _id: group._id }, { $addToSet: { members: { $each: toAdd } } });
    await Conversation.updateMany({ type: "group", groupId: group._id }, { $addToSet: { participants: { $each: toAdd } } });
    const admin = await requireAdmin();
    await GroupActivity.create({ groupId: group._id, actorId: admin._id, action: "members.added", details: `${toAdd.length} member(s) added` });
    const updated = await Group.findById(group._id).populate("members", "displayName username avatar status createdAt").populate("moderators", "displayName username avatar").lean();
    return NextResponse.json({ ok: true, group: JSON.parse(JSON.stringify(updated)), addedCount: toAdd.length }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add members.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const groupId = idSchema.parse(ctx.params.id);
    const { userId } = removeSchema.parse(await req.json());
    await connectDB();
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    if (!group.members.some((id: any) => String(id) === userId)) return NextResponse.json({ ok: false, error: "That user is not a member of this group." }, { status: 404 });
    await Group.updateOne({ _id: group._id }, { $pull: { members: userId, moderators: userId } });
    await Conversation.updateMany({ type: "group", groupId: group._id }, { $pull: { participants: userId } });
    const admin = await requireAdmin();
    await GroupActivity.create({ groupId: group._id, actorId: admin._id, targetUserId: userId, action: "member.removed", details: "Member removed from group" });
    const updated = await Group.findById(group._id).populate("members", "displayName username avatar status createdAt").populate("moderators", "displayName username avatar").lean();
    return NextResponse.json({ ok: true, group: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove member.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
    const groupId = idSchema.parse(ctx.params.id);
    const data = z.object({ userId: idSchema, role: z.enum(["member", "moderator"]) }).parse(await req.json());
    await connectDB();
    const group = await Group.findById(groupId);
    if (!group) return NextResponse.json({ ok: false, error: "Group not found." }, { status: 404 });
    if (!group.members.some((id: any) => String(id) === data.userId)) return NextResponse.json({ ok: false, error: "Only current members can be assigned a role." }, { status: 404 });
    if (data.role === "moderator") await Group.updateOne({ _id: groupId }, { $addToSet: { moderators: data.userId } });
    else await Group.updateOne({ _id: groupId }, { $pull: { moderators: data.userId } });
    const admin = await requireAdmin();
    await GroupActivity.create({ groupId, actorId: admin._id, targetUserId: data.userId, action: data.role === "moderator" ? "member.promoted" : "member.demoted", details: data.role === "moderator" ? "Moderator role assigned" : "Moderator role removed" });
    const updated = await Group.findById(groupId).populate("members", "displayName username avatar status createdAt").populate("moderators", "displayName username avatar").lean();
    return NextResponse.json({ ok: true, group: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update member role.";
    return NextResponse.json({ ok: false, error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
