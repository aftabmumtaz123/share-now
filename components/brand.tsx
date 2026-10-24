"use client";
import { useEffect, useState } from "react";
export default function Brand({compact=false}:{compact?:boolean}) {
  const [logo,setLogo]=useState("");
  const [name,setName]=useState("DevStak");
  useEffect(()=>{let live=true;const apply=(t:any)=>{if(!live||!t)return;setLogo(typeof t.logoUrl==="string"?t.logoUrl:"");setName(typeof t.brandName==="string"&&t.brandName.trim()?t.brandName:"DevStak")};fetch("/api/admin/theme").then(r=>r.json()).then(d=>apply(d.theme)).catch(()=>{});const changed=(e:Event)=>apply((e as CustomEvent).detail);window.addEventListener("devstak-theme-change",changed);return()=>{live=false;window.removeEventListener("devstak-theme-change",changed)}},[]);
  return <><span className={logo?"brand-logo-image":"brand-mark"}>{logo?<img src={logo} alt={`${name} logo`}/>:"D"}</span>{!compact&&<span className="brand-name">{name}</span>}</>;
}
