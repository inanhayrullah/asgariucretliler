"use client";

import { useEffect, useMemo, useState } from "react";

const MIN_GROSS = 33_030;
const MIN_TAX_BASE = MIN_GROSS * 0.85;
const STAMP_RATE = 0.00759;
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return Number.NaN;
  if (normalized.includes(",")) return Number(normalized.replace(/\./g, "").replace(",", "."));
  const decimalPoint = normalized.lastIndexOf(".");
  if (decimalPoint >= 0 && normalized.length - decimalPoint - 1 <= 2) return Number(normalized);
  return Number(normalized.replace(/\./g, ""));
}

function annualIncomeTax(base: number) {
  if (base <= 190_000) return base * 0.15;
  if (base <= 400_000) return 28_500 + (base - 190_000) * 0.2;
  if (base <= 1_500_000) return 70_500 + (base - 400_000) * 0.27;
  if (base <= 5_300_000) return 367_500 + (base - 1_500_000) * 0.35;
  return 1_697_500 + (base - 5_300_000) * 0.4;
}

function monthlyPayroll(gross: number, month: number) {
  const sgk = round2(gross * 0.14);
  const unemployment = round2(gross * 0.01);
  const monthlyTaxBase = round2(gross - sgk - unemployment);
  const previousTax = annualIncomeTax(monthlyTaxBase * (month - 1));
  const cumulativeTax = annualIncomeTax(monthlyTaxBase * month);
  const minimumExemption = annualIncomeTax(MIN_TAX_BASE * month) - annualIncomeTax(MIN_TAX_BASE * (month - 1));
  const incomeTax = round2(Math.max(0, cumulativeTax - previousTax - minimumExemption));
  const stampTax = round2(Math.max(0, gross - MIN_GROSS) * STAMP_RATE);
  const net = round2(gross - sgk - unemployment - incomeTax - stampTax);
  return { gross: round2(gross), net, sgk, unemployment, incomeTax, stampTax };
}

function grossForNet(targetNet: number, month: number) {
  let low = 0;
  let high = Math.max(targetNet * 3, MIN_GROSS);
  while (monthlyPayroll(high, month).net < targetNet && high < 1_000_000_000) high *= 2;
  for (let i = 0; i < 80; i++) {
    const middle = (low + high) / 2;
    if (monthlyPayroll(middle, month).net < targetNet) low = middle;
    else high = middle;
  }
  return round2(high);
}

export function WageCalculator() {
  const [direction, setDirection] = useState<"net-to-gross" | "gross-to-net">("net-to-gross");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("1");
  const numericAmount = parseAmount(amount);
  const selectedMonth = Number(month);

  useEffect(() => {
    setMonth(String(new Date().getMonth() + 1));
  }, []);

  const result = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
    const gross = direction === "net-to-gross" ? grossForNet(numericAmount, selectedMonth) : numericAmount;
    return monthlyPayroll(gross, selectedMonth);
  }, [direction, numericAmount, selectedMonth]);

  return (
    <div className="wage-calculator">
      <div className="wage-modes" role="group" aria-label="Hesaplama yönü">
        <button type="button" className={direction === "net-to-gross" ? "active" : ""} onClick={() => setDirection("net-to-gross")}>Netten brüte</button>
        <button type="button" className={direction === "gross-to-net" ? "active" : ""} onClick={() => setDirection("gross-to-net")}>Brütten nete</button>
      </div>
      <div className="wage-fields">
        <label>
          {direction === "net-to-gross" ? "Aylık net ücret" : "Aylık brüt ücret"}
          <span className="wage-input-wrap"><input type="text" inputMode="decimal" placeholder="Örn. 45.000" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={direction === "net-to-gross" ? "Aylık net ücret" : "Aylık brüt ücret"} /><span>TL</span></span>
        </label>
        <label>
          Hesaplama ayı
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>{new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(2026, index, 1))}</option>)}
          </select>
        </label>
      </div>
      {result ? (
        <div className="wage-results" aria-live="polite">
          <div className="wage-total"><span>{direction === "net-to-gross" ? "Tahmini brüt ücret" : "Tahmini net ücret"}</span><strong>{money.format(direction === "net-to-gross" ? result.gross : result.net)}</strong></div>
          <dl>
            <div><dt>Brüt ücret</dt><dd>{money.format(result.gross)}</dd></div>
            <div><dt>SGK işçi payı (%14)</dt><dd>− {money.format(result.sgk)}</dd></div>
            <div><dt>İşsizlik sigortası (%1)</dt><dd>− {money.format(result.unemployment)}</dd></div>
            <div><dt>Gelir vergisi (asgari ücret istisnası sonrası)</dt><dd>− {money.format(result.incomeTax)}</dd></div>
            <div><dt>Damga vergisi (asgari ücret istisnası sonrası)</dt><dd>− {money.format(result.stampTax)}</dd></div>
            <div className="wage-net"><dt>Net ücret</dt><dd>{money.format(result.net)}</dd></div>
          </dl>
        </div>
      ) : amount.trim() ? <p className="wage-error">Lütfen sıfırdan büyük geçerli bir ücret girin.</p> : <p className="wage-note">Asgari ücretle sınırlı değildir; hesaplamak istediğin aylık net veya brüt tutarı gir.</p>}
      <p className="wage-note">
        2026 tarifesiyle tahmini 4/a çalışan hesabıdır. Asgari ücret istisnası, ücret asgari ücretin üzerinde olsa da hesaba katılır. Aynı ücretin ocak ayından seçilen aya kadar değişmediği varsayılır; prim, ikramiye, engellilik indirimi ve kişisel bordro farklılıkları hesaba katılmaz.
        <br />Kaynaklar: <a href="https://www.csgb.gov.tr/poco-pages/asgari-ucret" target="_blank" rel="noreferrer">Çalışma ve Sosyal Güvenlik Bakanlığı</a>, <a href="https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf" target="_blank" rel="noreferrer">GİB 2026 gelir vergisi tarifesi</a>, <a href="https://www.sgk.gov.tr/Content/Post/c7812ea8-5087-413f-aeb5-d3c1d153e11a/Isveren-Prim-Oranlari-2026-01-13-04-52-38" target="_blank" rel="noreferrer">SGK prim oranları</a>.
      </p>
    </div>
  );
}
