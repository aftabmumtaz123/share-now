"use client";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, UsersRound, Search, ArrowUpRight, Archive, CheckCircle2, Settings2 } from "lucide-react";

type GroupItem = { _id: string; name: string; description?: string; avatar?: string; members: string[]; status: "active" | "archived"; createdAt?: string; updatedAt?: string };
type UserItem = { _id: string; displayName: string; username: string; status?: string };

export default function GroupAdminClient({ initialGroups, initialUsers = [] }: { initialGroups: GroupItem[]; initialUsers?: UserItem[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleGroups = useMemo(() => groups.filter(g => (statusFilter === "all" || g.status === statusFilter) && `${g.name} ${g.description || ""}`.toLowerCase().includes(search.toLowerCase())), [groups, search, statusFilter]);

  async function loadUsers() {
    if (users.length) return;
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    if (response.ok) setUsers(data.users || []);
  }

  async function create(e: FormEvent) {
    e.preventDefault(); setMsg(""); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, members }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create group.");
      setGroups(current => [{ ...data.group, members: data.group.members || [], status: data.group.status || "active" }, ...current]);
      setName(""); setDescription(""); setMembers([]); setCreating(false); setMsg("Group created successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create group."); }
    finally { setLoading(false); }
  }

  return <div className="group-admin-page">
    <div className="group-admin-toolbar">
      <div className="group-search"><Search size={17}/><input aria-label="Search groups" placeholder="Search groups by name or description…" value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div className="group-toolbar-actions"><select className="input group-filter" aria-label="Filter groups by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All groups</option><option value="active">Active</option><option value="archived">Archived</option></select><button className="btn" onClick={async () => { setCreating(v => !v); if (!creating) await loadUsers(); }}><Plus size={15}/>{creating ? "Close form" : "Create group"}</button></div>
    </div>
    {(msg || error) && <div className={error ? "toast group-error" : "toast group-success"} role="status">{error || msg}</div>}
    {creating && <form className="panel group-create-panel" onSubmit={create}>
      <div className="section-head"><div><h2>Create a group</h2><p className="muted">Set up a private space and choose its initial members.</p></div></div>
      <div className="group-create-grid"><div className="field"><label htmlFor="new-group-name">Group name</label><input id="new-group-name" className="input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Product team"/></div><div className="field"><label htmlFor="new-group-description">Description</label><textarea id="new-group-description" className="input" value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="What is this group for?"/></div></div>
      <div className="field"><label htmlFor="new-group-members">Initial members</label><select id="new-group-members" className="input group-member-select" multiple value={members} onChange={e => setMembers(Array.from(e.target.selectedOptions).map(o => o.value))}>{users.filter(u => u.status !== "disabled").map(u => <option key={u._id} value={u._id}>{u.displayName} (@{u.username})</option>)}</select><span className="muted">Hold Ctrl/Cmd to select multiple users. You can manage membership after creation.</span></div>
      <div className="group-form-footer"><span className="muted">{members.length} member{members.length === 1 ? "" : "s"} selected</span><button className="btn" disabled={loading}>{loading ? "Creating…" : <><Plus size={14}/> Create group</>}</button></div>
    </form>}
    <div className="group-list-heading"><div><h2>All groups <span className="badge" style={{ marginLeft: 8 }}>{visibleGroups.length}</span></h2><p className="muted">Open any group to manage its members, roles, settings, and status.</p></div></div>
    {visibleGroups.length ? <div className="group-admin-grid">{visibleGroups.map(g => <article className="panel group-admin-card" key={g._id}>
      <div className="group-card-top"><div className="avatar group-card-icon">{g.avatar ? <img src={g.avatar} alt=""/> : <UsersRound size={20}/>}</div><span className={`badge ${g.status === "archived" ? "pending" : ""}`}>{g.status === "archived" ? "Archived" : "Active"}</span></div>
      <h3>{g.name}</h3><p className="muted group-card-description">{g.description || "A private group conversation."}</p>
      <div className="group-card-meta"><span><UsersRound size={15}/>{g.members?.length || 0} members</span><span><Settings2 size={15}/>{g.status === "active" ? "Manage access" : "Read-only archive"}</span><span><span className="group-created-dot"/>Created {g.createdAt ? new Date(g.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}) : "—"}</span></div>
      <Link className="btn group-manage-link" href={`/admin/groups/${g._id}`}>Manage group <ArrowUpRight size={15}/></Link>
    </article>)}</div> : <div className="panel group-empty"><UsersRound size={28}/><h3>No groups found</h3><p className="muted">Try another search or create a new group.</p>{search || statusFilter !== "all" ? <button className="btn secondary" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear filters</button> : null}</div>}
  </div>;
}
