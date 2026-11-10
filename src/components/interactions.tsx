"use client";
import {useEffect,useRef,useState} from "react";
import {useMobileTap} from "@/components/mobile-tap";

const quickPrompts = [
  "İşe alım sözleşmesinde hangi maddelere dikkat edilmeli?",
  "Fazla mesai ve hafta tatili ücretlendirmesi nasıl yapılır?",
  "İşten çıkarma sebepleri ve fesih prosedürü nedir?",
  "Yıllık izin ve ücretli izin haklarım nelerdir?",
  "Kıdem tazminatı için şartlar ve hesaplama nasıl yapılır?"
];

export function ReflexGame(){const [phase,setPhase]=useState<"ready"|"playing"|"done">("ready"),[left,setLeft]=useState(0),[score,setScore]=useState(0),[best,setBest]=useState(0),deadline=useRef(0);useEffect(()=>{if(phase!=="playing")return;const t=setInterval(()=>{const remaining=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setLeft(remaining);if(remaining===0)setPhase("done")},200);return()=>clearInterval(t)},[phase]);function start(){setScore(0);setLeft(15);try{setBest(Number(localStorage.getItem("mesai-reflex-best")||0))}catch{}deadline.current=Date.now()+15000;setPhase("playing")}function hit(){if(phase!=="playing")return;if(Date.now()>=deadline.current){setLeft(0);setPhase("done");return}const next=score+1;setScore(next);if(next>best){setBest(next);try{localStorage.setItem("mesai-reflex-best",String(next))}catch{}}}const startTap=useMobileTap(start),hitTap=useMobileTap(hit);return <div className="gamebox"><span className="eyebrow">15 SANİYELİK REFLEKS</span><h2>{phase==="ready"?"Hazır olduğunda başla":phase==="playing"?"Hedefe dokun!":"Tur tamamlandı"}</h2><div className="score">{phase==="playing"?left+" sn":score}</div><p>{phase==="done"?`Skorun ${score} · Kişisel rekor ${best}`:`Skor ${score} · Rekor ${best}`}</p><div className="game-target">{phase==="playing"?<button {...hitTap} aria-label="Hedefe dokun">DOKUN</button>:<button {...startTap}>{phase==="ready"?"BAŞLAT":"YENİDEN OYNA"}</button>}</div></div>}

export function LegalAssistant(){
  const [messages,setMessages]=useState<string[]>([]),[value,setValue]=useState(""),[busy,setBusy]=useState(false);

  async function sendMessage(nextQuestion?: string){
    const q = (nextQuestion ?? value).trim();
    if(!q || busy) return;

    setMessages(m => [...m, "Siz: " + q]);
    setValue("");
    setBusy(true);

    try {
      const r = await fetch("/api/legal-assistant", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({message: q})
      });
      const d = await r.json();
      setMessages(m => [...m, "Asistan: " + (d.error || d.answer || "Şu anda yanıt verilemiyor.")]);
    } catch {
      setMessages(m => [...m, "Asistan: Hizmet şu anda kullanılamıyor."]);
    } finally {
      setBusy(false);
    }
  }

  async function send(e:React.FormEvent){
    e.preventDefault();
    await sendMessage();
  }

  return <div className="chatbox"><div className="chatassistantheader"><div><span className="eyebrow">ÜCRETSİZ YEREL HUKUK REHBERİ</span><h3>İş hukuku danışman asistanı</h3></div><span className="statusdot">Yerel rehber</span></div><div className="quickprompts">{quickPrompts.map((prompt)=><button key={prompt} type="button" onClick={()=>sendMessage(prompt)} disabled={busy}>{prompt}</button>)}</div><div className="chatmessages" aria-live="polite">{messages.length===0?<div className="assistantwelcome"><strong>Merhaba.</strong><p>İş sözleşmesi, ücret, izin, kıdem, işten çıkarma ve çalışma şartlarıyla ilgili temel hukuki sorularınızı iletebilirsiniz. Bu ücretsiz araç sabit konu başlıklarına göre çalışır; kişisel verilerinizi paylaşmayın.</p></div>:messages.map((m,i)=><div className={m.startsWith("Siz:")?"chatmsg user":"chatmsg"} key={i}>{m}</div>)}</div><form className="chatinput" onSubmit={send}><label className="sr-only" htmlFor="question">Sorunuz</label><textarea id="question" rows={2} maxLength={1000} value={value} onChange={e=>setValue(e.target.value)} placeholder="Örnek: İş sözleşmesinde erken fesih ve bildirim koşulları nelerdir?"/><button disabled={busy||!value.trim()}>{busy?"Gönderiliyor…":"Gönder"}</button></form><div className="assistantfooter"><span>Yerel rehber ücretsizdir; avukat danışmanlığı yerine geçmez.</span><button className="textbutton" onClick={()=>setMessages([])}>Yeni konuşma</button></div></div>}

