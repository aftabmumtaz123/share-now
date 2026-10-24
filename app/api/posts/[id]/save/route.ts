import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
export async function POST(_req:NextRequest,{params}:{params:{id:string}}){
 try { const me=await requireUser(); await connectDB(); if(!mongoose.isValidObjectId(params.id)) return NextResponse.json({ok:false,error:"Invalid post."},{status:400}); const post=await Post.findByIdAndUpdate(params.id,{$addToSet:{savedBy:me._id}},{new:true}).select("_id savedBy"); if(!post)return NextResponse.json({ok:false,error:"Post not found."},{status:404}); return NextResponse.json({ok:true,saved:true}); }
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Could not save post."},{status:400});}
}
export async function DELETE(_req:NextRequest,{params}:{params:{id:string}}){
 try { const me=await requireUser(); await connectDB(); if(!mongoose.isValidObjectId(params.id)) return NextResponse.json({ok:false,error:"Invalid post."},{status:400}); const post=await Post.findByIdAndUpdate(params.id,{$pull:{savedBy:me._id}},{new:true}).select("_id"); if(!post)return NextResponse.json({ok:false,error:"Post not found."},{status:404}); return NextResponse.json({ok:true,saved:false}); }
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Could not remove saved post."},{status:400});}
}
