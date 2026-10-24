import { connectDB } from "@/lib/db";
import { Group } from "@/lib/models";
import GroupAdminClient from "@/components/group-admin-client";

export default async function AdminGroups() {
  await connectDB();
  const groups = await Group.find().sort({ updatedAt: -1, createdAt: -1 }).limit(200).lean();
  const initialGroups = groups.map((g: any) => ({
    _id: String(g._id), name: g.name, description: g.description || "", avatar: g.avatar || "",
    members: (g.members || []).map(String), status: g.status || "active",
    createdAt: g.createdAt?.toISOString?.() || "", updatedAt: g.updatedAt?.toISOString?.() || "",
  }));
  return <>
    <div className="topbar"><div><div className="eyebrow">ADMINISTRATION / GROUPS</div><h1>Group management</h1><p className="subtitle">Manage group membership, permissions, conversations, and settings.</p></div></div>
    <GroupAdminClient initialGroups={initialGroups}/>
  </>;
}
