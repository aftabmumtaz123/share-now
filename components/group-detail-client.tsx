"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Archive, Check, ChevronDown, CircleAlert, LoaderCircle, MessageCircle, Search, Settings2, ShieldCheck, Trash2, UserMinus, UserPlus, UsersRound, RotateCcw, Save } from "lucide-react";

type Member = { _id: string; displayName: string; username: string; avatar?: string; status?: string; createdAt?: string };
type GroupData = { _id: string; name: string; description?: string; avatar?: string; status: "active" | "archived"; members: Member[]; moderators?: Member[]; createdBy?: string; createdAt?: string; updatedAt?: string };
type UserItem = { _id: string; displayName: string; username: string; avatar?: string; status?: string };
type ActivityItem = { _id: string; action: string; details?: string; createdAt?: string; actorId?: { displayName?: string; username?: string } | string; targetUserId?: { displayName?: string; username?: string } | string };

export default function GroupDetailClient({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tab, setTab] = useState("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<{ type: "remove" | "delete"; userId?: string; label?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [groupResponse, usersResponse] = await Promise.all([fetch(`/api/admin/groups/${groupId}`, { cache: "no-store" }), fetch("/api/admin/users", { cache: "no-store" })]);
      const groupData = await groupResponse.json();
      const usersData = await usersResponse.json();
      if (!groupResponse.ok) throw new Error(groupData.error || "Could not load this group.");
      if (!usersResponse.ok) throw new Error(usersData.error || "Could not load registered users.");
      const next = groupData.group as GroupData;
      setActivity(groupData.activity || []);
      setGroup(next); setName(next.name); setDescription(next.description || ""); setStatus(next.status || "active"); setUsers(usersData.users || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load group."); }
    finally { setLoading(false); }
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);

  const moderatorIds = useMemo(() => new Set((group?.moderators || []).map(m => String(m._id))), [group]);
  const memberIds = useMemo(() => new Set((group?.members || []).map(m => String(m._id))), [group]);
  const visibleMembers = useMemo(() => (group?.members || []).filter(m => `${m.displayName} ${m.username}`.toLowerCase().includes(memberSearch.toLowerCase())), [group, memberSearch]);
  const availableUsers = useMemo(() => users.filter(u => !memberIds.has(String(u._id)) && u.status !== "disabled" && `${u.displayName} ${u.username}`.toLowerCase().includes(userSearch.toLowerCase())), [users, memberIds, userSearch]);

  async function api(path: string, method: string, body?: unknown) {
    setError(""); setNotice(""); setBusy(path);
    try {
      const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The action could not be completed.");
      if (data.group) { setGroup(data.group); setName(data.group.name); setDescription(data.group.description || ""); setStatus(data.group.status || "active"); }
      const auditResponse = await fetch(`/api/admin/groups/${groupId}`, { cache: "no-store" });
      if (auditResponse.ok) { const auditData = await auditResponse.json(); setActivity(auditData.activity || []); }
      return data;
    } catch (e) { setError(e instanceof Error ? e.message : "The action could not be completed."); throw e; }
    finally { setBusy(""); }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setError(""); setNotice(""); setUploadingAvatar(true);
    try {
      const form = new FormData(); form.set("image", file);
      const response = await fetch(`/api/admin/groups/${groupId}/avatar`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload group image.");
      setGroup(current => current ? { ...current, avatar: data.avatar } : current);
      setNotice("Group image updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload group image."); }
    finally { setUploadingAvatar(false); }
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api(`/api/admin/groups/${groupId}`, "PATCH", { name, description, status }); setNotice("Group settings saved."); }
    catch { /* error is shown above the form */ }
    finally { setSaving(false); }
  }

  async function addSelected() {
    if (!selected.length) return;
    try { const data = await api(`/api/admin/groups/${groupId}/members`, "POST", { userIds: selected }); setSelected([]); setUserSearch(""); setNotice(`${data.addedCount || selected.length} member(s) added successfully.`); }
    catch { /* error shown in page */ }
  }

  async function removeMember(userId: string) {
    try { await api(`/api/admin/groups/${groupId}/members`, "DELETE", { userId }); setConfirm(null); setNotice("Member removed from the group."); }
    catch { /* error shown in page */ }
  }

  async function changeRole(userId: string, role: "member" | "moderator") {
    try { await api(`/api/admin/groups/${groupId}/members`, "PATCH", { userId, role }); setNotice(role === "moderator" ? "Moderator role assigned." : "Moderator role removed."); }
    catch { /* error shown in page */ }
  }

  async function toggleArchive() {
    if (!group) return;
    try { await api(`/api/admin/groups/${groupId}`, "PATCH", { status: group.status === "active" ? "archived" : "active" }); setNotice(group.status === "active" ? "Group archived." : "Group restored."); }
    catch { /* error shown in page */ }
  }

  async function deleteGroup() {
    try { await api(`/api/admin/groups/${groupId}`, "DELETE"); window.location.assign("/admin/groups"); }
    catch { setConfirm(null); }
  }

  if (loading) return <div className="panel group-loading"><LoaderCircle className="spin" size={25}/><span>Loading group details…</span></div>;
  if (!group) return <div className="panel group-error-state"><CircleAlert size={24}/><h2>Unable to open this group</h2><p>{error || "The group may have been deleted or you may not have access."}</p><Link className="btn" href="/admin/groups">Back to groups</Link></div>;

  return <div className="group-detail-page">
    {(error || notice) && <div className={error ? "toast group-error" : "toast group-success"} role="status">{error || notice}</div>}
    <section className="panel group-detail-hero"><div className="group-detail-avatar">{group.avatar ? <img src={group.avatar} alt=""/> : <UsersRound size={26}/>}</div><div className="group-detail-title"><div className="group-detail-title-line"><h2>{group.name}</h2><span className={`badge ${group.status === "archived" ? "pending" : ""}`}>{group.status}</span></div><p className="muted">{group.description || "No description has been added yet."}</p><div className="group-detail-meta"><span><UsersRound size={14}/>{group.members.length} members</span><span><ShieldCheck size={14}/>{group.moderators?.length || 0} moderators</span><span>Created {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : "—"}</span></div></div><div className="group-detail-hero-actions"><Link className="btn secondary" href={`/messages?group=${group._id}`}><MessageCircle size={15}/> Open conversation <ArrowUpRight size={14}/></Link><button className="btn secondary" onClick={() => void load()} disabled={!!busy}><RotateCcw size={15}/> Refresh</button></div></section>
    <div className="group-detail-tabs" role="tablist" aria-label="Group management sections">{[{id:"members",label:"Members",icon:UsersRound},{id:"settings",label:"Settings",icon:Settings2},{id:"activity",label:"Activity",icon:ShieldCheck}].map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "group-tab active" : "group-tab"} onClick={() => setTab(item.id)}><item.icon size={16}/>{item.label}{item.id === "members" && <span>{group.members.length}</span>}</button>)}</div>
    {tab === "members" && <div className="group-member-layout">
      <section className="panel group-members-panel"><div className="section-head group-section-heading"><div><h2>Members</h2><p className="muted">Manage access for the people in this group.</p></div><span className="badge">{group.members.length} total</span></div><div className="group-search group-member-search"><Search size={16}/><input placeholder="Search members…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} aria-label="Search current members"/></div>
        {visibleMembers.length ? <div className="group-member-list">{visibleMembers.map(member => { const isModerator = moderatorIds.has(String(member._id)); return <div className="group-member-row" key={member._id}><div className="group-member-avatar">{member.avatar ? <img src={member.avatar} alt=""/> : <span>{(member.displayName || member.username || "U").slice(0,1).toUpperCase()}</span>}</div><div className="group-member-main"><strong>{member.displayName}</strong><span>@{member.username}</span></div><span className={`group-role-pill ${isModerator ? "moderator" : ""}`}>{isModerator ? "Moderator" : "Member"}</span><div className="group-member-actions"><button className="btn secondary compact" disabled={!!busy} onClick={() => void changeRole(String(member._id), isModerator ? "member" : "moderator")} title={isModerator ? "Remove moderator role" : "Promote to moderator"}><ShieldCheck size={14}/><span>{isModerator ? "Demote" : "Promote"}</span></button><button className="icon-button danger-icon" disabled={!!busy} onClick={() => setConfirm({ type: "remove", userId: String(member._id), label: member.displayName })} aria-label={`Remove ${member.displayName}`} title="Remove member"><UserMinus size={16}/></button></div></div>; })}</div> : <div className="group-empty compact-empty"><UsersRound size={23}/><p>No members match your search.</p></div>}
      </section>
      <aside className="panel group-add-panel"><div className="section-head"><div><h2><UserPlus size={17}/> Add members</h2><p className="muted">Choose registered users to add.</p></div></div>{group.status === "archived" ? <div className="group-inline-warning"><Archive size={17}/> Restore this group before adding members.</div> : <><div className="group-search"><Search size={16}/><input placeholder="Find people by name or username…" value={userSearch} onChange={e => setUserSearch(e.target.value)} aria-label="Search users to add"/></div><div className="group-user-picker">{availableUsers.slice(0, 80).map(user => <label className="group-user-option" key={user._id}><input type="checkbox" checked={selected.includes(String(user._id))} onChange={e => setSelected(current => e.target.checked ? [...current, String(user._id)] : current.filter(id => id !== String(user._id)))}/><div className="group-member-avatar small">{user.avatar ? <img src={user.avatar} alt=""/> : <span>{(user.displayName || user.username || "U").slice(0,1).toUpperCase()}</span>}</div><span><strong>{user.displayName}</strong><small>@{user.username}</small></span></label>)}{!availableUsers.length && <div className="group-picker-empty">No available users found.</div>}</div><div className="group-add-footer"><span className="muted">{selected.length} selected</span><button className="btn" onClick={() => void addSelected()} disabled={!selected.length || !!busy}><UserPlus size={15}/>{busy.endsWith("/members") && selected.length ? "Adding…" : "Add members"}</button></div></>}</aside>
    </div>}
    {tab === "settings" && <section className="panel group-settings-panel"><div className="section-head"><div><h2>Group settings</h2><p className="muted">Update group details, image, and lifecycle status.</p></div></div><div className="group-avatar-editor"><div className="group-detail-avatar">{group.avatar ? <img src={group.avatar} alt="Current group image"/> : <UsersRound size={24}/>}</div><div><strong>Group image</strong><p className="muted">JPG, PNG, or WebP · Maximum 5 MB</p></div><label className="btn secondary group-avatar-upload">{uploadingAvatar ? "Uploading…" : "Change image"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={e => { void uploadAvatar(e.target.files?.[0]); e.currentTarget.value = ""; }}/></label></div><form onSubmit={saveDetails}><div className="field"><label htmlFor="group-name">Group name</label><input id="group-name" className="input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required/></div><div className="field"><label htmlFor="group-description">Description</label><textarea id="group-description" className="input" value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={500}/><span className="muted">Up to 500 characters.</span></div><div className="field"><label htmlFor="group-status">Group status</label><select id="group-status" className="input" value={status} onChange={e => setStatus(e.target.value as "active" | "archived")}><option value="active">Active — members can access conversations</option><option value="archived">Archived — conversation access is paused</option></select></div><div className="group-settings-actions"><button className="btn" disabled={saving || !!busy}><Save size={15}/>{saving ? "Saving…" : "Save changes"}</button><button type="button" className="btn secondary" onClick={() => { setName(group.name); setDescription(group.description || ""); setStatus(group.status); }}>Reset</button></div></form><div className="group-danger-zone"><div><h3>Group lifecycle</h3><p>{group.status === "active" ? "Archive this group to pause member access without removing its history." : "Restore this group to allow members to access the group again."}</p></div><button className="btn secondary" disabled={!!busy} onClick={() => void toggleArchive()}>{group.status === "active" ? <><Archive size={15}/> Archive group</> : <><RotateCcw size={15}/> Restore group</>}</button></div><div className="group-danger-zone destructive"><div><h3>Delete group permanently</h3><p>Deletes the group and its conversation history. Uploaded conversation files are removed from storage first. If cleanup fails, the group is retained.</p></div><button className="btn danger" disabled={!!busy} onClick={() => setConfirm({ type: "delete", label: group.name })}><Trash2 size={15}/> Delete group</button></div></section>}
    {tab === "activity" && <section className="panel group-activity-panel"><div className="section-head"><div><h2>Group activity</h2><p className="muted">Recent administrative actions for this group.</p></div><span className="badge">{activity.length} events</span></div>{activity.length ? activity.map(item => { const actor = typeof item.actorId === "object" ? item.actorId?.displayName || item.actorId?.username || "Administrator" : "Administrator"; const target = typeof item.targetUserId === "object" ? item.targetUserId?.displayName || item.targetUserId?.username : ""; const labels: Record<string,string> = { "group.created":"Group created", "group.updated":"Group settings updated", "group.archived":"Group archived", "group.restored":"Group restored", "group.deleted":"Group deleted", "members.added":"Members added", "member.removed":"Member removed", "member.promoted":"Moderator promoted", "member.demoted":"Moderator role removed" }; return <div className="group-activity-item" key={item._id}><div className="group-activity-icon"><Check size={16}/></div><div className="group-activity-content"><strong>{labels[item.action] || item.action}</strong><p>{item.details || (target ? `Affected user: ${target}` : "Administrative action")}</p><span className="muted">{actor} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Time unavailable"}</span></div></div>; }) : <div className="group-empty compact-empty"><ShieldCheck size={23}/><p>No activity recorded yet.</p></div>}</section>}
    {confirm && <div className="group-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setConfirm(null); }}><div className="group-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="group-confirm-title"><div className="group-confirm-icon"><Trash2 size={20}/></div><h2 id="group-confirm-title">{confirm.type === "delete" ? "Delete this group?" : "Remove this member?"}</h2><p>{confirm.type === "delete" ? `“${confirm.label}” and its group conversation history will be permanently deleted. This cannot be undone.` : `Remove ${confirm.label} from this group? They will lose access to the group conversation.`}</p><div className="group-confirm-actions"><button className="btn secondary" onClick={() => setConfirm(null)} disabled={!!busy}>Cancel</button><button className="btn danger" disabled={!!busy} onClick={() => confirm.type === "delete" ? void deleteGroup() : confirm.userId ? void removeMember(confirm.userId) : undefined}>{busy ? "Working…" : confirm.type === "delete" ? "Delete permanently" : "Remove member"}</button></div></div></div>}
  </div>;
}
