import {timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";

export async function POST(request:Request){
  const secret=process.env.PUBLISH_CRON_SECRET;const supplied=Buffer.from(request.headers.get("authorization")||"");const expected=Buffer.from(secret?`Bearer ${secret}`:"");
  if(!secret||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)return NextResponse.json({error:"Publishing is not configured"},{status:503});
  const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await supabase.rpc("publish_due_articles");
  if(error){console.error("Scheduled publishing task failed",error.code);return NextResponse.json({error:"Publishing task failed"},{status:503})}
  return NextResponse.json({published:Array.isArray(data)?data.length:0});
}
