"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, UsersRound, MessageCircle, Clock3, Archive, Users } from "lucide-react";
type GroupItem={_id:string;name:string;description:string;status:"active"|"archived";membersCount:number;updatedAt:string;lastMessage:string;lastMessageAt:string|null};
// Use an explicit locale and timezone so SSR and the browser render identical date text.
function formatGroupDate(value:string){return new Date(value).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});}
export default function GroupsBrowser({groups}:{groups:GroupItem[]}){
 const [query,setQuery]=useState(""); const [filter,setFilter]=useState<"all"|"active"|"archived">("all");
 const visible=useMemo(()=>groups.filter(g=>(filter==="all"||g.status===filter)&&`${g.name} ${g.description}`.toLowerCase().includes(query.trim().toLowerCase())),[groups,query,filter]);
 const activeCount=groups.filter(g=>g.status==="active").length; const archivedCount=groups.filter(g=>g.status==="archived").length;
 return <>
  <section className="groups-toolbar panel">
   <label className="groups-search"><Search size={17}/><input aria-label="Search groups" placeholder="Search your groups..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" className="groups-clear" onClick={()=>setQuery("")}>Clear</button>}</label>
   <div className="groups-filters" role="group" aria-label="Filter groups">{([{id:"all",label:`All groups (${groups.length})`},{id:"active",label:`Active (${activeCount})`},{id:"archived",label:`Archived (${archivedCount})`}] as const).map(f=><button type="button" key={f.id} className={`groups-filter ${filter===f.id?"selected":""}`} onClick={()=>setFilter(f.id)}>{f.label}</button>)}</div>
  </section>
  {visible.length ? <div className="groups-grid">{visible.map(g=><article className="group-card" key={g._id}>
   <div className="group-card-top"><div className="group-icon"><UsersRound size={22}/></div><span className={`badge ${g.status==="archived"?"archived":""}`}>{g.status==="active"?"Active":"Archived"}</span></div>
   <div className="group-card-body"><h2>{g.name}</h2><p className="muted group-description">{g.description||"A private group space for conversations and shared materials."}</p>
    <div className="group-meta"><span><Users size={15}/>{g.membersCount} {g.membersCount===1?"member":"members"}</span>{g.lastMessageAt&&<span title={new Date(g.lastMessageAt).toLocaleString()}><Clock3 size={14}/>{formatGroupDate(g.lastMessageAt)}</span>}</div>
    <div className="group-last-message"><MessageCircle size={15}/><span>{g.lastMessage||"No messages yet. Start the conversation."}</span></div>
   </div>
   <div className="group-card-footer">{g.status==="active"?<Link className="btn" href={`/messages?group=${g._id}`}>Open group <ArrowUpRight size={15}/></Link>:<span className="group-archived-note"><Archive size={14}/> This group is archived</span>}</div>
  </article>)}</div>:<section className="panel empty groups-empty"><div className="group-empty-icon"><UsersRound size={25}/></div><h2>{query?"No matching groups":"No groups here yet"}</h2><p>{query?"Try another name or clear your search.":filter==="archived"?"Archived groups assigned to you will appear here.":"Your administrator can add you to a group. Once assigned, it will appear here."}</p>{query&&<button className="btn secondary" onClick={()=>{setQuery("");setFilter("all")}}>Clear filters</button>}</section>}
  <p className="groups-footnote">You can open active groups assigned to you. Group membership and access are managed by your administrator.</p>
 </>;
}
