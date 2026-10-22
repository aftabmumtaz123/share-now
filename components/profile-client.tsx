"use client";
import { useRef, useState } from "react";
import { Camera, Check, Copy, Fingerprint, ImagePlus, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

type Props = { displayName: string; username: string; connectionCode: string; avatar?: string };
export default function ProfileClient({ displayName, username, connectionCode, avatar: initialAvatar = "" }: Props) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setNotice("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setNotice("Your image must be 5 MB or smaller."); return; }
    setBusy(true); setNotice("");
    try {
      const form = new FormData(); form.append("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update profile picture.");
      setAvatar(data.avatar); setNotice("Profile picture updated successfully.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(connectionCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setNotice("Could not copy the code. Please select and copy it manually."); }
  }
  return <div className="profile-page">
    <section className="profile-cover-card panel">
      <div className="profile-cover-art" aria-hidden="true"><span className="profile-cover-orb profile-cover-orb-one"/><span className="profile-cover-orb profile-cover-orb-two"/></div>
      <div className="profile-cover-content">
        <div className="profile-avatar-wrap profile-avatar-large">
          {avatar ? <img className="profile-avatar-image" src={avatar} alt={`${displayName} profile`} /> : <div className="profile-avatar-fallback"><UserRound size={34}/></div>}
          <button className="profile-avatar-edit" type="button" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Change profile picture">{busy ? <LoaderCircle size={16} className="spin"/> : <Camera size={16}/>}</button>
          <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(e.currentTarget.files?.[0])}/>
        </div>
        <div className="profile-identity"><div className="eyebrow">YOUR ACCOUNT</div><h2>{displayName}</h2><p>@{username}</p><span className="profile-member-pill"><ShieldCheck size={13}/> DevStak member</span></div>
        <button type="button" className="btn profile-change-button" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus size={16}/>{busy ? "Uploading…" : "Change photo"}</button>
      </div>
    </section>
    {notice && <div className={"profile-notice " + (notice.includes("successfully") ? "success" : "")} role="status">{notice}</div>}
    <div className="profile-details-grid">
      <section className="panel profile-details-card">
        <div className="profile-section-heading"><div className="profile-heading-icon"><UserRound size={18}/></div><div><h3>Personal information</h3><p>Basic details associated with your account.</p></div></div>
        <div className="field"><label htmlFor="profile-display-name">Display name</label><input id="profile-display-name" className="input" value={displayName} readOnly /></div>
        <div className="field"><label htmlFor="profile-username">Username</label><div className="profile-readonly-field"><span>@</span><input id="profile-username" className="input" value={username} readOnly /></div></div>
        <div className="profile-readonly-note"><LockKeyhole size={15}/><span>Your account details are managed by your administrator.</span></div>
      </section>
      <section className="panel profile-code-card">
        <div className="profile-section-heading"><div className="profile-heading-icon"><Fingerprint size={18}/></div><div><h3>Your connection code</h3><p>Share it with people you want to connect with.</p></div></div>
        <div className="profile-code-display"><div className="eyebrow">SIX-DIGIT CODE</div><strong>{connectionCode}</strong><button type="button" className="btn profile-copy-button" onClick={() => void copyCode()}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copied" : "Copy code"}</button></div>
        <div className="profile-code-tip"><ShieldCheck size={16}/><span>Only share this code with people you trust.</span></div>
      </section>
    </div>
    <section className="panel profile-photo-help"><div className="profile-help-icon"><Camera size={19}/></div><div><h3>Make your profile yours</h3><p>Use a clear photo so friends can recognize you in conversations and posts.</p><span>JPG, PNG or WebP · Maximum 5 MB</span></div><button type="button" className="btn secondary" onClick={() => inputRef.current?.click()} disabled={busy}>Choose image</button></section>
  </div>;
}
