import { getCurrentUser } from "@/lib/auth";
import ProfileClient from "@/components/profile-client";
export default async function ProfilePage() { const u = await getCurrentUser(); return <><div className="topbar"><div><div className="eyebrow">ACCOUNT</div><h1>Your profile</h1><p className="subtitle">Manage your profile picture and account information.</p></div></div><ProfileClient displayName={u!.displayName} username={u!.username} connectionCode={u!.connectionCode} avatar={u!.avatar || ""} /></>; }
