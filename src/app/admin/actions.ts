"use server";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {slugifyTurkish} from "@/lib/slugify.mjs";

async function currentEditor(){
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/admin/login");
  const {data:profile,error}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(error)redirect("/admin/login?error=profil");
  if(!profile||!(["admin","editor"] as string[]).includes(profile.role))redirect("/admin/login?error=yetki");
  return {supabase,user,role:profile.role as "admin"|"editor"};
}

export async function signIn(formData:FormData){
  const email=String(formData.get("email")||"").trim();const password=String(formData.get("password")||"");
  if(email.length>254||password.length<1||password.length>256)redirect("/admin/login?error=bilgi");
  let supabase;try{supabase=await createSupabaseServerClient()}catch{redirect("/admin/login?error=yapilandirma")}
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error)redirect("/admin/login?error=giris");
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile,error:profileError}=user?await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle():{data:null,error:null};
  if(profileError)redirect("/admin/login?error=profil");
  if(!profile||!(["admin","editor"] as string[]).includes(profile.role)){await supabase.auth.signOut();redirect("/admin/login?error=yetki")}
  redirect("/admin");
}

export async function signOut(){const supabase=await createSupabaseServerClient();await supabase.auth.signOut();redirect("/admin/login")}

export async function createArticle(formData:FormData){
  const {supabase}=await currentEditor();
  const title=String(formData.get("title")||"").trim();const excerpt=String(formData.get("excerpt")||"").trim();const categoryId=String(formData.get("category_id")||"");const text=String(formData.get("content")||"").trim();
  const slug=slugifyTurkish(String(formData.get("slug")||title));
  if(title.length<5||title.length>180||excerpt.length>500||text.length>30000||!slug||slug.length>180)redirect("/admin?error=dogrulama");
  const blocks=text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(text=>({type:"paragraph",text}));
  const {error}=await supabase.from("articles").insert({title,slug,excerpt,content:blocks,category_id:categoryId||null,status:"draft",origin:"editorial"});
  if(error)redirect("/admin?error="+(error.code==="23505"?"slug":"kayit"));
  redirect("/admin?saved=1");
}

export async function submitForReview(formData:FormData){const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/admin?error=dogrulama");const {supabase}=await currentEditor();const {error}=await supabase.from("articles").update({status:"review"}).eq("id",id).eq("status","draft");if(error)redirect("/admin?error=kayit");redirect("/admin?saved=1")}

export async function publishArticle(formData:FormData){const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/admin?error=dogrulama");const {supabase,role}=await currentEditor();if(role!=="admin")redirect("/admin?error=yetki");const now=new Date().toISOString();const {error}=await supabase.from("articles").update({status:"published",published_at:now,first_published_at:now}).eq("id",id).in("status",["review","scheduled"]);if(error)redirect("/admin?error=kayit");redirect("/admin?saved=1")}

export async function unpublishArticle(formData:FormData){const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/admin?error=dogrulama");const {supabase,role}=await currentEditor();if(role!=="admin")redirect("/admin?error=yetki");const {error}=await supabase.from("articles").update({status:"draft",published_at:null}).eq("id",id).eq("status","published");if(error)redirect("/admin?error=kayit");redirect("/admin?saved=1")}

export async function updateArticle(formData:FormData){const id=String(formData.get("id")||"");if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/admin?error=dogrulama");const {supabase}=await currentEditor();const title=String(formData.get("title")||"").trim();const excerpt=String(formData.get("excerpt")||"").trim();const text=String(formData.get("content")||"").trim();const slug=slugifyTurkish(String(formData.get("slug")||title));const categoryId=String(formData.get("category_id")||"");if(title.length<5||title.length>180||excerpt.length>500||text.length>30000||!slug||slug.length>180)redirect("/admin?error=dogrulama");const content=text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(text=>({type:"paragraph",text}));const {error}=await supabase.from("articles").update({title,slug,excerpt,content,category_id:categoryId||null,updated_at:new Date().toISOString()}).eq("id",id);if(error)redirect("/admin?error="+(error.code==="23505"?"slug":"kayit"));redirect("/admin?saved=1")}

export async function scheduleArticle(formData:FormData){const id=String(formData.get("id")||"");const scheduled=Date.parse(String(formData.get("scheduled_at")||""));if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isFinite(scheduled)||scheduled<Date.now()+60000)redirect("/admin?error=tarih");const {supabase,role}=await currentEditor();if(role!=="admin")redirect("/admin?error=yetki");const {error}=await supabase.from("articles").update({status:"scheduled",scheduled_at:new Date(scheduled).toISOString()}).eq("id",id).in("status",["draft","review"]);if(error)redirect("/admin?error=kayit");redirect("/admin?saved=1")}
