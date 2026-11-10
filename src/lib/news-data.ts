import {createClient} from "@supabase/supabase-js";
import {cacheLife} from "next/cache";
import {articles as demoArticles,type Article} from "@/lib/news";
import {getSupabasePublicKey} from "@/lib/supabase/config";

type DbArticle={slug:string;title:string;excerpt:string|null;content:unknown;published_at:string|null;author_name:string|null;cover_image_url:string|null;categories:{name:string}|null};

export async function getPublishedArticles():Promise<Article[]>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=getSupabasePublicKey();
  if(!url||!key)return process.env.NODE_ENV==="development"?demoArticles:[];
  return readPublishedArticles(url,key);
}

async function readPublishedArticles(url:string,key:string):Promise<Article[]>{
  "use cache";
  cacheLife("minutes");
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await supabase.from("articles").select("slug,title,excerpt,content,published_at,author_name,cover_image_url,categories(name)").eq("status","published").order("published_at",{ascending:false}).limit(100);
  if(error||!data)return [];
  return (data as unknown as DbArticle[]).map(row=>{
    const body=Array.isArray(row.content)?row.content.map(block=>typeof block==="object"&&block!==null&&"text" in block?String(block.text):"").filter(Boolean):[];
    const date=row.published_at?new Intl.DateTimeFormat("tr-TR",{dateStyle:"long",timeZone:"Europe/Istanbul"}).format(new Date(row.published_at)):"";
    const words=body.join(" ").split(/\s+/).filter(Boolean).length;
    return {slug:row.slug,category:row.categories?.name||"Gündem",title:row.title,excerpt:row.excerpt||"",body,date,read:Math.max(1,Math.ceil(words/200))+" dk",image:row.cover_image_url||"",imageUrl:row.cover_image_url||undefined,byline:row.author_name||"Editör Masası"};
  });
}
