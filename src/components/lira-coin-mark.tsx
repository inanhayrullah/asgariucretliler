import Image from "next/image";

export function LiraCoinMark({ priority = false }: { priority?: boolean }) {
  return (
    <span className="lira-coin-mark" role="img" aria-label="1 Türk lirası madeni para">
      <Image className="lira-coin-image" src="/1-tl.png" alt="" width={203} height={205} sizes="(max-width: 900px) 64px, 76px" priority={priority} />
    </span>
  );
}
