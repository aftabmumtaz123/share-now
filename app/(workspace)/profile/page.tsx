import { getCurrentUser } from "@/lib/auth";
import ProfileClient from "@/components/profile-client";
export default async function ProfilePage() { const u = await getCurrentUser(); return <><ProfileClient userId={String(u!._id)} displayName={u!.displayName} username={u!.username} connectionCode={u!.connectionCode} avatar={u!.avatar || ""} bio={u!.bio || ""} banner={u!.banner || ""} /></>; }
