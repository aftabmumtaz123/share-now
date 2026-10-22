"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, Users, UsersRound, Settings, HardDrive, UserCircle, LogOut, UserRoundSearch } from "lucide-react";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; adminOnly?: boolean };
export default function AppShell({children,user,admin=false}:{children:React.ReactNode;user:{displayName:string;username:string};admin?:boolean}) {
 const pathname=usePathname();
 const items:NavItem[]=admin?[
  {label:"Overview",href:"/admin",icon:LayoutDashboard},
  {label:"Users",href:"/admin/users",icon:Users},
  {label:"Groups",href:"/admin/groups",icon:UsersRound},
  {label:"Conversations",href:"/admin/conversations",icon:MessageCircle},
  {label:"Storage",href:"/admin/storage",icon:HardDrive},
  {label:"Settings",href:"/settings",icon:Settings},
 ]:[
  {label:"Dashboard",href:"/dashboard",icon:LayoutDashboard},
  {label:"Messages",href:"/messages",icon:MessageCircle},
  {label:"Friends",href:"/connections",icon:Users},
  {label:"Suggested friends",href:"/connections#suggested",icon:UserRoundSearch},
  {label:"Groups",href:"/groups",icon:UsersRound},
  {label:"Profile",href:"/profile",icon:UserCircle},
  {label:"Settings",href:"/settings",icon:Settings},
 ];
 const active=(href:string)=>{
  const path=href.split("#")[0];
  if(href.includes("#")) return false;
  if(path==="/dashboard") return pathname==="/dashboard" || pathname==="/";
  return pathname===path || (path!=="/" && pathname.startsWith(path+"/"));
 };
 return <div className="app-shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">D</span> DevStak</Link><div className="nav-label">WORKSPACE</div><nav className="workspace-nav">{items.map(({label,href,icon:Icon})=><Link className={"nav-item "+(active(href)?"active":"")} key={href} href={href}><Icon size={17}/><span>{label}</span></Link>)}</nav><div className="side-bottom"><div className="avatar">{user.displayName.slice(0,1).toUpperCase()}</div><div style={{minWidth:0,flex:1}}><div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.displayName}</div><div style={{fontSize:10,color:"#929bab"}}>{admin?"Administrator":`@${user.username}`}</div></div><form action="/api/auth/logout" method="post"><button title="Sign out" style={{border:0,background:"transparent",color:"#8993a3"}}><LogOut size={16}/></button></form></div></aside><main className="main">{children}</main></div>;
}
