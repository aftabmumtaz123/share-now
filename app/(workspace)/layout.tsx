import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) { const user=await getCurrentUser(); if(!user) redirect("/login"); return <AppShell user={{displayName:user.displayName,username:user.username}}>{children}</AppShell>; }
