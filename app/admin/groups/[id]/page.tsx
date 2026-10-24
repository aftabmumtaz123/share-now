import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GroupDetailClient from "@/components/group-detail-client";

export default function AdminGroupDetails({ params }: { params: { id: string } }) {
  return <>
    <div className="topbar"><div><Link href="/admin/groups" className="group-back-link"><ArrowLeft size={15}/> Back to groups</Link><div className="eyebrow" style={{ marginTop: 18 }}>ADMINISTRATION / GROUPS / DETAILS</div><h1>Manage group</h1><p className="subtitle">Edit group details, manage membership, and control access.</p></div></div>
    <GroupDetailClient groupId={params.id}/>
  </>;
}
