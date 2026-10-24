import { UsersRound } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Group, Conversation } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";
import GroupsBrowser from "@/components/groups-browser";
export default async function GroupsPage(){
 await connectDB(); const u=await getCurrentUser();
 const groups=await Group.find({members:u!._id}).sort({updatedAt:-1}).lean();
 const ids=groups.map((g:any)=>g._id); const conversations=await Conversation.find({type:"group",groupId:{$in:ids},participants:u!._id}).select("groupId lastMessage lastMessageAt updatedAt").lean();
 const conversationByGroup=new Map(conversations.map((c:any)=>[String(c.groupId),c]));
 const items=groups.map((g:any)=>{const c:any=conversationByGroup.get(String(g._id));return {_id:String(g._id),name:g.name,description:g.description||"",status:g.status as "active"|"archived",membersCount:Array.isArray(g.members)?g.members.length:0,updatedAt:new Date(g.updatedAt||g.createdAt||Date.now()).toISOString(),lastMessage:typeof c?.lastMessage==="string"?c.lastMessage:"",lastMessageAt:c?.lastMessageAt?new Date(c.lastMessageAt).toISOString():null};});
 return <><div className="topbar"><div><div className="eyebrow">TEAM SPACES</div><h1>Your groups</h1><p className="subtitle">Find your team spaces, catch up on activity, and continue the conversation.</p></div><div className="groups-total"><UsersRound size={17}/><span>{groups.length} {groups.length===1?"group":"groups"}</span></div></div><GroupsBrowser groups={items}/></>;
}
