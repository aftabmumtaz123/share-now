"use client";
import { useEffect } from "react";
export default function ThemeRuntime(){
  useEffect(()=>{let alive=true;const apply=(t:any)=>{if(!alive||!t)return;const root=document.documentElement;root.style.setProperty("--brand",t.accent||"#635bff");root.style.setProperty("--page-bg",t.background||"#f4f7fb");root.style.setProperty("--panel-bg",t.surface||"#ffffff");root.style.setProperty("--card-radius",t.radius==="sharp"?"6px":t.radius==="soft"?"12px":"18px");root.dataset.layout=t.layout||"spacious";root.dataset.font=t.font||"modern";};const load=()=>fetch("/api/admin/theme").then(r=>r.json()).then(d=>apply(d.theme)).catch(()=>{});void load();const changed=(e:Event)=>apply((e as CustomEvent).detail);window.addEventListener("devstak-theme-change",changed);return()=>{alive=false;window.removeEventListener("devstak-theme-change",changed)}},[]);
  return null;
}
