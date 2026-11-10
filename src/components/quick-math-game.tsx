"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMobileTap } from "@/components/mobile-tap";

type Problem = { first: number; second: number; operator: "+" | "−" };

function createProblem(): Problem {
  const first = Math.floor(Math.random() * 20) + 1;
  const second = Math.floor(Math.random() * 20) + 1;
  if (Math.random() < 0.5) return { first, second, operator: "+" };
  return { first: Math.max(first, second), second: Math.min(first, second), operator: "−" };
}

export function QuickMathGame() {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [left, setLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [problem, setProblem] = useState<Problem>({ first: 8, second: 3, operator: "+" });
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("30 saniyede kaç işlemi çözebilirsin?");
  const deadline = useRef(0);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("mesai-quick-math-best") || 0));
    } catch {}
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) setPhase("done");
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done" || score <= best) return;
    setBest(score);
    try {
      localStorage.setItem("mesai-quick-math-best", String(score));
    } catch {}
  }, [phase, score, best]);

  function start() {
    setScore(0);
    setLeft(30);
    setAnswer("");
    setMessage("Cevabını yazıp Enter'a bas.");
    setProblem(createProblem());
    deadline.current = Date.now() + 30_000;
    setPhase("playing");
  }

  const startTap = useMobileTap(start);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "playing" || answer.trim() === "") return;
    const result = problem.operator === "+" ? problem.first + problem.second : problem.first - problem.second;
    if (Number(answer) === result) {
      setScore((current) => current + 1);
      setProblem(createProblem());
      setAnswer("");
      setMessage("Doğru! Devam et.");
    } else {
      setMessage("Tekrar dene.");
    }
  }

  return (
    <section className="gamebox math-game" aria-label="Hızlı hesap oyunu">
      <span className="eyebrow">30 SANİYELİK HIZLI HESAP</span>
      <h2>{phase === "ready" ? "Zihinden çöz!" : phase === "playing" ? "Sıradaki işlem" : "Süre doldu!"}</h2>
      <div className="score">{phase === "playing" ? `${left} sn` : score}</div>
      <p>{phase === "done" ? `Skorun ${score} · Rekor ${best}` : phase === "playing" ? `${message} Skor: ${score}` : message}</p>
      {phase === "playing" ? (
        <form className="math-form" onSubmit={submit}>
          <label className="math-problem" htmlFor="math-answer">{problem.first} {problem.operator} {problem.second} =</label>
          <input id="math-answer" type="number" inputMode="numeric" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} aria-label="İşlemin cevabı" />
          <button type="submit" onPointerDown={(event) => event.preventDefault()}>Cevapla</button>
        </form>
      ) : (
        <div className="game-target"><button {...startTap}>{phase === "ready" ? "BAŞLAT" : "YENİDEN OYNA"}</button></div>
      )}
      <p className="math-best">En iyi skor: {best}</p>
    </section>
  );
}
