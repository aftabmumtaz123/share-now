"use client";
import { useRef, useState } from "react";
import { Camera, LoaderCircle, UserRound } from "lucide-react";

type Props = { displayName: string; username: string; connectionCode: string; avatar?: string };
export default function ProfileClient({ displayName, username, connectionCode, avatar: initialAvatar = "" }: Props) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setNotice("");
    try { const form = new FormData(); form.append("avatar", file); const response = await fetch("/api/profile/avatar", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update profile picture."); setAvatar(data.avatar); setNotice("Profile picture updated successfully."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed."); } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  return <div className="panel profile-panel" style={{ maxWidth: 650 }}>
    <div className="profile-hero"><div className="profile-avatar-wrap">{avatar ? <img className="profile-avatar-image" src={avatar} alt={`${displayName} profile`} /> : <div className="profile-avatar-fallback"><UserRound size={30}/></div>}<button className="profile-avatar-edit" type="button" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Change profile picture">{busy ? <LoaderCircle size={16} className="spin"/> : <Camera size={16}/>}</button><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e.currentTarget.files?.[0])}/></div><div><h2 style={{ fontFamily: "Manrope", marginBottom: 4 }}>{displayName}</h2><div className="muted">@{username}</div><button type="button" className="profile-upload-button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Uploading…" : avatar ? "Change profile picture" : "Upload profile picture"}</button><p className="profile-help">JPG, PNG or WebP · Maximum 5 MB</p></div></div>
    {notice && <div className={notice.includes("successfully") ? "profile-notice success" : "profile-notice"} role="status">{notice}</div>}
    <div className="field"><label>Display name</label><input className="input" value={displayName} readOnly /></div><div className="field"><label>Username</label><input className="input" value={username} readOnly /></div><div className="field"><label>Your six-digit connection code</label><input className="input" value={connectionCode} readOnly /></div>
  </div>;
}
