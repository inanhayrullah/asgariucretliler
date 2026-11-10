import Link from "next/link";import {type Article} from "@/lib/news";
export function Photo({id,alt="",className="",imageUrl}:{id:string;alt?:string;className?:string;imageUrl?:string}){
	const raw=imageUrl||("https://images.unsplash.com/"+id+"?auto=format&fit=crop&w=1100&q=80");
	let source="";
	const localPath=!/^[a-z][a-z\d+.-]*:/i.test(raw)&&!raw.startsWith("//")&&!raw.split(/[?#]/,1)[0].split("/").includes("..");
	if(localPath){
		source=new URL(raw,"http://local.invalid").pathname;
	}else{
		try{
			const u=new URL(raw);
			const storageHost=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname:"";
			if(u.protocol==="https:"&&(u.hostname==="images.unsplash.com"||u.hostname===storageHost))source=u.href;
		}catch{}
	}
	source=source.replaceAll("\\","").replaceAll('"',"%22").replaceAll("(","%28").replaceAll(")","%29");
	return <div className={"photo "+className} role="img" aria-label={alt} style={source?{backgroundImage:`url("${source}")`}:{}}/>;
}
export function StoryCard({article:a,large=false}:{article:Article;large?:boolean}){return <article className={large?"story large":"story"}><Link href={"/haber/"+a.slug} className="storylink"><Photo id={a.image} imageUrl={a.imageUrl} alt={a.title}/><div className="storycopy"><span className="eyebrow">{a.category}</span><h3>{a.title}</h3><p>{a.excerpt}</p><div className="byline">{a.date} <i>·</i> {a.read}</div></div></Link></article>}
export function LatestList({items}:{items:Article[]}){return <div className="latestlist">{items.map((a,i)=><Link className="latestitem" href={"/haber/"+a.slug} key={a.slug}><span className="latestnum">{String(i+1).padStart(2,"0")}</span><span><small>{a.category}</small><b>{a.title}</b><em>{a.date} · {a.read}</em></span></Link>)}</div>}
