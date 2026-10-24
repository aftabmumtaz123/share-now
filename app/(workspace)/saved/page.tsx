import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Post } from "@/lib/models";
import SavedPostsClient from "@/components/saved-posts-client";
export default async function SavedPostsPage(){await connectDB();const me=await getCurrentUser();const rows=await Post.find({savedBy:me!._id}).sort({updatedAt:-1}).populate("authorId","displayName username avatar").lean();const posts=rows.map((p:any)=>({_id:String(p._id),text:p.text||"",imageUrl:p.imageUrl||"",createdAt:new Date(p.createdAt||Date.now()).toISOString(),author:{displayName:p.authorId?.displayName||"Unknown user",username:p.authorId?.username||"unknown",avatar:p.authorId?.avatar||""}}));return <><div className="topbar"><div><div className="eyebrow">YOUR COLLECTION</div><h1>Saved posts</h1><p className="subtitle">Keep useful posts close and return to them whenever you need.</p></div></div><SavedPostsClient initialPosts={posts}/></>}
