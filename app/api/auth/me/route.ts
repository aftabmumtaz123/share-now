import {NextResponse} from "next/server";import {getCurrentUser} from "@/lib/auth";
export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({ok:false},{status:401});return NextResponse.json({ok:true,user:{id:String(user._id),username:user.username,displayName:user.displayName,role:user.role,connectionCode:user.connectionCode,avatar:user.avatar}});}
