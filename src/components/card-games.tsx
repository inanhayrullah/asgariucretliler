"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useMobileTap } from "@/components/mobile-tap";

type Suit = "♣" | "♦" | "♥" | "♠";
type PlayingCard = { rank: number; suit: Suit; faceUp: boolean; id: number };
type KlondikeState = { stock: PlayingCard[]; waste: PlayingCard[]; columns: PlayingCard[][]; foundations: PlayingCard[][] };
type Selection = { source: "waste" } | { source: "column"; column: number; index: number } | { source: "foundation"; foundation: number };
const SUITS: Suit[] = ["♣", "♦", "♥", "♠"];
const RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const isRed = (suit: Suit) => suit === "♦" || suit === "♥";

function playFireworksSound() {
  try {
    const sound = new Audio("/fireworks-celebration.mp3");
    sound.volume = 0.8;
    void sound.play().catch(() => {});
  } catch { /* Audio can be unavailable or disabled by the browser. */ }
}

function playLoseSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [392, 329.63].forEach((frequency, index) => {
      const start = now + index * 0.17;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.33);
    });
    window.setTimeout(() => void context.close(), 800);
  } catch { /* Audio can be unavailable or disabled by the browser. */ }
}

function klondikeHasMoves(game: KlondikeState) {
  const canGoToFoundation = (card: PlayingCard) => {
    const pile = game.foundations.find((foundation) => foundation.at(-1)?.suit === card.suit);
    return pile ? card.rank === pile.at(-1)!.rank + 1 : card.rank === 1;
  };
  const canGoToColumn = (card: PlayingCard, sourceColumn: number | null) => game.columns.some((column, index) => {
    if (index === sourceColumn) return false;
    const top = column.at(-1);
    return top ? top.faceUp && isRed(top.suit) !== isRed(card.suit) && top.rank === card.rank + 1 : card.rank === 13;
  });

  // Each stock or waste card can eventually be brought to the top by drawing and recycling.
  if ([...game.stock, ...game.waste].some((card) => canGoToFoundation(card) || canGoToColumn(card, null))) return true;
  if (game.foundations.some((foundation) => {
    const card = foundation.at(-1);
    return card && canGoToColumn(card, null);
  })) return true;
  for (let sourceIndex = 0; sourceIndex < game.columns.length; sourceIndex++) {
    const column = game.columns[sourceIndex];
    const topCard = column.at(-1);
    if (topCard && canGoToFoundation(topCard)) return true;
    for (let index = 0; index < column.length; index++) {
      const card = column[index];
      if (!card.faceUp) continue;
      const sequence = column.slice(index);
      if (!sequence.every((item, sequenceIndex) => item.faceUp && (sequenceIndex === 0 ||
        sequence[sequenceIndex - 1].rank === item.rank + 1 && isRed(sequence[sequenceIndex - 1].suit) !== isRed(item.suit)))) continue;
      if (canGoToColumn(card, sourceIndex)) return true;
    }
  }
  return false;
}

function VictoryCelebration({ onRestart }: { onRestart: () => void }) {
  return <div className="card-victory-overlay" role="alert" aria-live="assertive">
    <svg className="victory-fireworks" viewBox="0 0 960 420" preserveAspectRatio="none" aria-hidden="true">
      {[
        { x: 250, y: 242, delay: "0s", color: "#ffd166" },
        { x: 480, y: 225, delay: "0.45s", color: "#7ce7ff" },
        { x: 710, y: 242, delay: "0.9s", color: "#ff79c6" },
      ].map((firework) => <g key={firework.x} transform={`translate(${firework.x} ${firework.y})`} fill="none" stroke={firework.color} strokeWidth="2.5" strokeLinecap="round">
        {Array.from({ length: 23 }, (_, index) => {
          const angle = -Math.PI * 0.98 + index / 22 * Math.PI * 0.96;
          const distance = 105 + (index % 5) * 17;
          const endX = Math.cos(angle) * distance;
          const endY = Math.sin(angle) * distance;
          const curve = Math.sin(index * 1.8) * 14;
          const path = `M 0 0 Q ${endX * 0.5 + curve} ${endY * 0.5 - 10} ${endX} ${endY}`;
          return <path key={index} d={path} pathLength="1" strokeDasharray="1" strokeDashoffset="1" opacity="0">
            <animate attributeName="stroke-dashoffset" values="1;0;0;1" keyTimes="0;0.14;0.55;1" dur="2.8s" begin={firework.delay} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0.8;0" keyTimes="0;0.14;0.55;1" dur="2.8s" begin={firework.delay} repeatCount="indefinite" />
          </path>;
        })}
      </g>)}
    </svg>
    <div className="card-victory-message">
      <strong>Tebrikler, kazandın!</strong>
    </div>
    <button className="card-action" onClick={onRestart}>Yeni oyun</button>
  </div>;
}

function shuffledDeck(shuffle = true): PlayingCard[] {
  const cards = SUITS.flatMap((suit, suitIndex) => Array.from({ length: 13 }, (_, index) => ({
    rank: index + 1, suit, faceUp: false, id: suitIndex * 13 + index,
  })));
  for (let i = shuffle ? cards.length - 1 : 0; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function newKlondike(shuffle = true): KlondikeState {
  const deck = shuffledDeck(shuffle);
  const columns = Array.from({ length: 7 }, (_, column) => {
    const cards = deck.splice(0, column + 1);
    cards.forEach((card, index) => { card.faceUp = index === cards.length - 1; });
    return cards;
  });
  return { stock: deck, waste: [], columns, foundations: [[], [], [], []] };
}

function CardFace({ card, selected = false, onClick, onDoubleActivate, draggable = false, onDragStart, onDragEnd, fastMouse = false }: { card?: PlayingCard; selected?: boolean; onClick?: () => void; onDoubleActivate?: () => void; draggable?: boolean; onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void; onDragEnd?: () => void; fastMouse?: boolean }) {
  const lastTouchTap = useRef(0);
  const lastDoubleActivation = useRef(0);
  const skipNextClick = useRef(false);
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hideSelection, setHideSelection] = useState(false);
  const tapEvents = useMobileTap(() => onClick?.());
  function waitForSecondTap() {
    if (!onDoubleActivate) return;
    if (selectionTimer.current) clearTimeout(selectionTimer.current);
    setHideSelection(true);
    selectionTimer.current = setTimeout(() => {
      selectionTimer.current = null;
      setHideSelection(false);
    }, 350);
  }
  function finishDoubleTap() {
    if (selectionTimer.current) clearTimeout(selectionTimer.current);
    selectionTimer.current = null;
    setHideSelection(false);
  }
  useEffect(() => () => {
    if (selectionTimer.current) clearTimeout(selectionTimer.current);
  }, []);
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (skipNextClick.current) { skipNextClick.current = false; return; }
    if (fastMouse && event.detail > 1) return;
    if (fastMouse && event.detail > 0) { tapEvents.onClick(); return; }
    if (event.detail > 1) {
      finishDoubleTap();
      lastDoubleActivation.current = Date.now();
      onDoubleActivate?.();
      return;
    }
    waitForSecondTap();
    tapEvents.onClick();
  }
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") skipNextClick.current = false;
    if (fastMouse && event.pointerType === "mouse" && event.button === 0 && event.detail <= 1) {
      skipNextClick.current = true;
      tapEvents.onClick();
    }
  }
  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!onDoubleActivate || event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTouchTap.current <= 350) {
      lastTouchTap.current = 0;
      lastDoubleActivation.current = now;
      skipNextClick.current = true;
      finishDoubleTap();
      onDoubleActivate();
    } else {
      lastTouchTap.current = now;
      skipNextClick.current = true;
      waitForSecondTap();
      tapEvents.onClick();
    }
  }
  function handleDoubleClick() {
    if (Date.now() - lastDoubleActivation.current < 500) return;
    finishDoubleTap();
    lastDoubleActivation.current = Date.now();
    onDoubleActivate?.();
  }
  const cardEvents = { ...tapEvents, onClick: handleClick, onPointerDown: handlePointerDown, onPointerUp: handlePointerUp, onDoubleClick: handleDoubleClick, onDragEnd };
  if (!card) return <button className="playing-card card-empty" {...cardEvents} aria-label="Boş kart alanı" />;
  if (!card.faceUp) return <button className="playing-card card-back" {...cardEvents} aria-label="Kapalı kart" />;
  return <button className={`playing-card ${isRed(card.suit) ? "card-red" : ""} ${selected && !hideSelection ? "card-selected" : ""}`} {...cardEvents} draggable={draggable} onDragStart={onDragStart} aria-label={`${RANK_LABELS[card.rank]} ${card.suit}`}>
    <span className="card-rank">{RANK_LABELS[card.rank]}</span><span className="card-symbol">{card.suit}</span>
  </button>;
}

export function KlondikeGame() {
  // Keep server and first client render identical; randomize after hydration.
  const [game, setGame] = useState(() => newKlondike(false));
  const lostSoundPlayed = useRef(false);
  const previousGame = useRef<KlondikeState | null>(null);
  const undoUsed = useRef(false);
  const [touchDevice, setTouchDevice] = useState(false);
  useEffect(() => { setGame(newKlondike()); }, []);
  const won = game.foundations.reduce((sum, pile) => sum + pile.length, 0) === 52;
  const lost = !won && !klondikeHasMoves(game);
  useEffect(() => {
    if (lost && !lostSoundPlayed.current) {
      lostSoundPlayed.current = true;
      playLoseSound();
    } else if (!lost) lostSoundPlayed.current = false;
  }, [lost]);
  useEffect(() => {
    setTouchDevice(window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window);
  }, []);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [message, setMessage] = useState("Bir kartı seç, ardından hedef sütuna veya uygun temele dokun.");

  function restart() {
    setGame(newKlondike()); setSelected(null); previousGame.current = null; undoUsed.current = false; setMessage("Yeni oyun başladı. Ctrl+Z hakkın kullanılmadı.");
  }
  function rememberMove() {
    if (!undoUsed.current) previousGame.current = structuredClone(game);
  }
  function undo() {
    if (undoUsed.current || !previousGame.current) {
      setMessage("Geri alma hakkın yok veya zaten kullanıldı.");
      return;
    }
    setGame(structuredClone(previousGame.current));
    previousGame.current = null;
    undoUsed.current = true;
    setSelected(null);
    setMessage("Son hamle geri alındı. Bu oyundaki Ctrl+Z hakkın kullanıldı.");
  }
  useEffect(() => {
    function handleUndo(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      undo();
    }
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  });
  function drawStock() {
    if (game.stock.length || game.waste.length) rememberMove();
    setGame((old) => {
      const next = structuredClone(old);
      if (next.stock.length) {
        const card = next.stock.pop()!; card.faceUp = true; next.waste.push(card);
      } else if (next.waste.length) {
        next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false })); next.waste = [];
      }
      return next;
    });
    setSelected(null);
  }
  function removeSelection(next: KlondikeState, selection: Selection) {
    if (selection.source === "waste") return next.waste.pop()!;
    if (selection.source === "foundation") return next.foundations[selection.foundation].pop()!;
    const column = next.columns[selection.column];
    const moved = column.splice(selection.index);
    const newlyExposed = column.at(-1);
    if (newlyExposed) newlyExposed.faceUp = true;
    return moved;
  }
  function moveToColumn(targetIndex: number, sourceSelection = selected) {
    if (!sourceSelection) return;
    const sequence = sourceSelection.source === "waste" ? [game.waste.at(-1)!] : sourceSelection.source === "foundation" ? [game.foundations[sourceSelection.foundation].at(-1)!] : game.columns[sourceSelection.column].slice(sourceSelection.index);
    const bottom = sequence[0];
    const top = game.columns[targetIndex].at(-1);
    const validSequence = sequence.every((card, index) => card.faceUp && (index === 0 ||
      sequence[index - 1].rank === card.rank + 1 && isRed(sequence[index - 1].suit) !== isRed(card.suit)));
    const canMove = sequence.length > 0 && validSequence && !(sourceSelection.source === "column" && sourceSelection.column === targetIndex) &&
      (top ? (top.faceUp && isRed(top.suit) !== isRed(bottom.suit) && top.rank === bottom.rank + 1) : bottom.rank === 13);
    if (canMove) rememberMove();
    setGame((old) => {
      if (!canMove) return old;
      const next = structuredClone(old);
      const cards = removeSelection(next, sourceSelection);
      next.columns[targetIndex].push(...(Array.isArray(cards) ? cards : [cards]));
      return next;
    });
    setSelected(null);
    setMessage(canMove ? "Kartlar taşındı." : "Bu kartlar o sütuna taşınamıyor.");
  }
  function moveToFoundation(foundationIndex: number, sourceSelection = selected) {
    if (!sourceSelection) return;
    const card = sourceSelection.source === "waste" ? game.waste.at(-1) : sourceSelection.source === "foundation" ? undefined : game.columns[sourceSelection.column]?.[sourceSelection.index];
    const foundation = game.foundations[foundationIndex];
    const top = foundation.at(-1);
    const canMove = Boolean(card && (sourceSelection.source === "waste" || sourceSelection.source === "column" && sourceSelection.index === game.columns[sourceSelection.column].length - 1) &&
      (top ? top.suit === card.suit && card.rank === top.rank + 1 : card.rank === 1));
    if (canMove) rememberMove();
    setGame((old) => {
      if (!canMove) return old;
      const next = structuredClone(old);
      const movedCard = removeSelection(next, sourceSelection);
      next.foundations[foundationIndex].push(Array.isArray(movedCard) ? movedCard[0] : movedCard);
      return next;
    });
    setSelected(null);
    setMessage(canMove ? "Kart temele yerleştirildi." : "Temele yalnızca sıradaki aynı tür kart taşınabilir.");
    if (canMove && game.foundations.reduce((sum, pile) => sum + pile.length, 0) === 51) {
      setMessage("Tebrikler, oyunu tamamladın!");
      playFireworksSound();
    }
  }

  function autoMove(selection: Selection) {
    const card = selection.source === "waste" ? game.waste.at(-1) : selection.source === "foundation" ? game.foundations[selection.foundation]?.at(-1) : game.columns[selection.column]?.[selection.index];
    if (!card?.faceUp) return;
    const sequence = selection.source === "waste" || selection.source === "foundation" ? [card] : game.columns[selection.column].slice(selection.index);
    const bottom = sequence[0];
    const validSequence = sequence.every((item, index) => item.faceUp && (index === 0 ||
      sequence[index - 1].rank === item.rank + 1 && isRed(sequence[index - 1].suit) !== isRed(item.suit)));
    const canMoveToFoundation = selection.source === "waste" || selection.source === "column" && selection.index === game.columns[selection.column].length - 1;

    if (canMoveToFoundation) {
      const foundationIndex = game.foundations.findIndex((foundation) => {
        const top = foundation.at(-1);
        return top ? top.suit === card.suit && card.rank === top.rank + 1 : card.rank === 1;
      });
      if (foundationIndex !== -1) {
        moveToFoundation(foundationIndex, selection);
        return;
      }
    }

    if (!validSequence) return;
    const columnIndex = game.columns.findIndex((column, index) => {
      if (selection.source === "column" && selection.column === index) return false;
      const top = column.at(-1);
      return top ? isRed(top.suit) !== isRed(bottom.suit) && top.rank === bottom.rank + 1 : bottom.rank === 13;
    });
    if (columnIndex !== -1) moveToColumn(columnIndex, selection);
  }

  function activateFoundation(foundationIndex: number) {
    if (selected) {
      moveToFoundation(foundationIndex);
      return;
    }
    if (game.foundations[foundationIndex].length) setSelected({ source: "foundation", foundation: foundationIndex });
  }

  function startCardDrag(event: React.DragEvent<HTMLButtonElement>, source: Selection) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "solitaire-card");
    setSelected(source);
  }

  function allowCardDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return <div className={`cards-table klondike-game${won ? " klondike-game-won" : ""}`}>
    <div className="card-toolbar"><p>{message} · Destede kalan: {game.stock.length} kart · Ctrl+Z hakkı: {undoUsed.current ? "kullanıldı" : previousGame.current ? "hazır" : "kullanılmadı"}</p><div className="card-actions"><button className="card-action" onClick={undo} disabled={undoUsed.current || !previousGame.current}>Geri al (Ctrl+Z)</button> <button className="card-action" onClick={restart}>Yeni oyun</button></div></div>
    <div className="card-toprow">
      <div className="card-foundations">{game.foundations.map((pile, index) => <div key={index} onDragOver={allowCardDrop} onDrop={(event) => { event.preventDefault(); moveToFoundation(index); }}><CardFace card={pile.at(-1)} selected={selected?.source === "foundation" && selected.foundation === index} onClick={() => activateFoundation(index)} onDoubleActivate={() => selected?.source === "foundation" && selected.foundation === index && autoMove(selected)} /></div>)}</div>
      <div className="card-pair">
        <div className="card-waste-fan">
          {game.waste.slice(-3).map((card, index, visible) => {
            const isTop = index === visible.length - 1;
            return <div className="card-waste-card" key={card.id} style={{ left: `${index * 15}px`, zIndex: index + 1 }}>
              <CardFace card={card} draggable={!touchDevice && isTop} onDragStart={(event) => isTop && startCardDrag(event, { source: "waste" })} selected={isTop && selected?.source === "waste"} onClick={() => isTop && setSelected((current) => current?.source === "waste" ? null : { source: "waste" })} onDoubleActivate={() => isTop && autoMove({ source: "waste" })} />
            </div>;
          })}
          {!game.waste.length && <div className="card-placeholder" />}
        </div>
        <CardFace onClick={drawStock} />
      </div>
    </div>
    <div className="klondike-columns">{game.columns.map((column, columnIndex) => <div className="klondike-column" key={columnIndex} onDragOver={allowCardDrop} onDrop={(event) => { event.preventDefault(); moveToColumn(columnIndex); }} onClick={() => column.length === 0 && selected && moveToColumn(columnIndex)}>
      {column.length ? column.map((card, cardIndex) => <div className="stacked-playing-card" key={card.id}>
        <CardFace card={card} draggable={!touchDevice && card.faceUp} onDragStart={(event) => card.faceUp && startCardDrag(event, { source: "column", column: columnIndex, index: cardIndex })} selected={selected?.source === "column" && selected.column === columnIndex && cardIndex >= selected.index}
          onDoubleActivate={() => card.faceUp && autoMove({ source: "column", column: columnIndex, index: cardIndex })}
          onClick={() => {
            if (selected) moveToColumn(columnIndex);
            else if (card.faceUp) setSelected({ source: "column", column: columnIndex, index: cardIndex });
          }} />
      </div>) : <CardFace onClick={() => selected && moveToColumn(columnIndex)} />}
    </div>)}</div>
    <p className="card-help">Telefonda veya bilgisayarda karta çift dokunup tıklayarak uygun yere otomatik taşı. İstersen önce karta, sonra hedef sütuna veya temele dokun; bilgisayarda kartları sürükleyebilirsin.</p>
    {won && <VictoryCelebration onRestart={restart} />}
    {lost && !won && <div className="spider-lost-overlay" role="alert" aria-live="assertive"><strong>Bu oyunu kaybettin</strong><button className="card-action" onClick={restart}>Yeni oyun</button></div>}
  </div>;
}

type SpiderCard = { rank: number; faceUp: boolean; id: number };
type SpiderState = { stock: SpiderCard[]; columns: SpiderCard[][]; completed: number };

function newSpider(shuffle = true): SpiderState {
  const deck = Array.from({ length: 104 }, (_, id) => ({ rank: id % 13 + 1, faceUp: false, id }));
  for (let i = shuffle ? deck.length - 1 : 0; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const columns = Array.from({ length: 10 }, (_, column) => {
    const cards = deck.splice(0, column < 4 ? 6 : 5);
    cards.forEach((card, index) => { card.faceUp = index === cards.length - 1; });
    return cards;
  });
  return { stock: deck, columns, completed: 0 };
}

function spiderHasMoves(game: SpiderState) {
  if (game.completed === 8 || game.stock.length >= 10 && game.columns.every((column) => column.length > 0)) return true;
  for (let sourceIndex = 0; sourceIndex < game.columns.length; sourceIndex++) {
    const source = game.columns[sourceIndex];
    for (let cardIndex = 0; cardIndex < source.length; cardIndex++) {
      const sequence = source.slice(cardIndex);
      if (!sequence[0].faceUp || !sequence.every((card, index) => card.faceUp && (index === 0 || sequence[index - 1].rank === card.rank + 1))) continue;
      for (let targetIndex = 0; targetIndex < game.columns.length; targetIndex++) {
        if (targetIndex === sourceIndex) continue;
        const top = game.columns[targetIndex].at(-1);
        if (!top || top.rank === sequence[0].rank + 1) return true;
      }
    }
  }
  return false;
}

export function SpiderSolitaireGame() {
  // Keep server and first client render identical; randomize after hydration.
  const [game, setGame] = useState(() => newSpider(false));
  const gameRef = useRef(game);
  function commitGame(next: SpiderState) { gameRef.current = next; setGame(next); }
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  useEffect(() => { commitGame(newSpider()); setReady(true); }, []);
  const won = game.completed === 8;
  useEffect(() => { if (ready && !won && !spiderHasMoves(game)) setLost(true); }, [game, ready, won]);
  const previousGame = useRef<SpiderState | null>(null);
  const undoUsed = useRef(false);
  const [selected, setSelected] = useState<{ column: number; index: number } | null>(null);
  const draggedSelection = useRef<{ column: number; index: number } | null>(null);
  const [message, setMessage] = useState("Bir sütunun açık kartını seç, sonra başka bir sütuna dokun. Çift dokunarak uygun sütuna otomatik taşı.");
  function restart() { commitGame(newSpider()); setSelected(null); setLost(false); previousGame.current = null; undoUsed.current = false; setMessage("Yeni oyun başladı. Ctrl+Z hakkın kullanılmadı."); }
  function undo() {
    if (undoUsed.current || !previousGame.current) {
      setMessage("Geri alma hakkın yok veya zaten kullanıldı.");
      return;
    }
    commitGame(structuredClone(previousGame.current));
    previousGame.current = null;
    undoUsed.current = true;
    setSelected(null);
    setMessage("Son hamle geri alındı. Bu oyundaki Ctrl+Z hakkın kullanıldı.");
  }
  useEffect(() => {
    function handleUndo(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      undo();
    }
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  });
  function deal() {
    if (lost || won) return;
    const current = gameRef.current;
    if (current.stock.length < 10 || current.columns.some((column) => !column.length)) {
      setMessage(current.stock.length < 10 ? "Destede kart kalmadı." : "Dağıtmadan önce boş sütunları doldur."); return;
    }
    if (!undoUsed.current) previousGame.current = structuredClone(current);
    const next = structuredClone(current);
    for (const column of next.columns) { const card = next.stock.pop()!; card.faceUp = true; column.push(card); }
    commitGame(next);
    setSelected(null);
  }
  function move(targetIndex: number, sourceSelection = selected) {
    if (lost || won || sourceSelection === null) return;
    const current = gameRef.current;
    const source = current.columns[sourceSelection.column];
    const target = current.columns[targetIndex];
    if (!source || !target) return;
    const sequence = source.slice(sourceSelection.index);
    const bottom = sequence[0]; const top = target.at(-1);
    const validSequence = sequence.every((card, index) => card.faceUp && (index === 0 || sequence[index - 1].rank === card.rank + 1));
    const canMove = sourceSelection.column !== targetIndex && validSequence && Boolean(bottom) && (top ? top.rank === bottom!.rank + 1 : true);
    if (!canMove || !bottom) {
      setSelected(null);
      setMessage("Kartı buraya taşıyamazsın.");
      return;
    }
    if (!undoUsed.current) previousGame.current = structuredClone(current);
    const next = structuredClone(current);
    const from = next.columns[sourceSelection.column]; const to = next.columns[targetIndex];
    const moved = from.splice(sourceSelection.index);
    to.push(...moved);
    if (from.at(-1)) from.at(-1)!.faceUp = true;
    const run = to.slice(-13);
    if (run.length === 13 && run[0].rank === 13 && run.every((item, index) => item.rank === 13 - index)) {
      to.splice(-13, 13); next.completed += 1;
      if (to.at(-1)) to.at(-1)!.faceUp = true;
    }
    if (next.completed === 8 && current.completed !== 8) playFireworksSound();
    commitGame(next);
    setSelected(null);
    setMessage("Kart taşındı.");
  }
  function autoMove(sourceSelection: { column: number; index: number }) {
    const current = gameRef.current;
    const source = current.columns[sourceSelection.column];
    const sequence = source.slice(sourceSelection.index);
    const bottom = sequence[0];
    const validSequence = sequence.length > 0 && sequence.every((card, index) => card.faceUp &&
      (index === 0 || sequence[index - 1].rank === card.rank + 1));
    if (!validSequence || !bottom) return;
    const targetIndex = current.columns.findIndex((column, index) => {
      if (index === sourceSelection.column) return false;
      const top = column.at(-1);
      return top ? top.rank === bottom.rank + 1 : true;
    });
    if (targetIndex !== -1) move(targetIndex, sourceSelection);
  }
  return <div className={`cards-table spider-game${lost || won ? " spider-game-lost" : ""}`}>
    <div className="card-toolbar"><p>{message} · Tamamlanan: {game.completed}/8</p><div className="card-actions"><button className="card-action" onClick={deal} disabled={game.stock.length < 10}>Dağıt ({game.stock.length})</button> <button className="card-action" onClick={restart}>Yeni oyun</button></div></div>
    <div className="spider-columns">{game.columns.map((column, columnIndex) => <div className="spider-column" key={columnIndex} onPointerDown={(event) => { if (event.button === 0 && event.target === event.currentTarget && selected !== null) { event.preventDefault(); move(columnIndex); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedSelection.current) move(columnIndex, draggedSelection.current); draggedSelection.current = null; }} onClick={() => column.length === 0 && selected !== null && move(columnIndex)}>
      {column.length ? column.map((card, cardIndex) => <div className="stacked-playing-card" key={card.id}>
        <CardFace card={{ ...card, suit: "♠" }} selected={selected?.column === columnIndex && cardIndex >= selected.index} fastMouse draggable={card.faceUp}
          onDragEnd={() => { draggedSelection.current = null; }}
          onDragStart={(event) => {
            if (!card.faceUp) { event.preventDefault(); return; }
            draggedSelection.current = { column: columnIndex, index: cardIndex };
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", "spider-card");
            setSelected({ column: columnIndex, index: cardIndex });
          }}
          onDoubleActivate={() => card.faceUp && autoMove({ column: columnIndex, index: cardIndex })}
          onClick={() => {
            if (!card.faceUp) {
              if (selected) setSelected(null);
              return;
            }
            if (selected) {
              if (selected.column === columnIndex && selected.index === cardIndex) {
                setSelected(null);
                return;
              }
              move(columnIndex);
              return;
            }
            const sequence = column.slice(cardIndex);
            if (sequence.every((item, index) => index === 0 || sequence[index - 1].rank === item.rank + 1)) setSelected({ column: columnIndex, index: cardIndex });
            else { setSelected(null); setMessage("Taşınacak kartlar aynı türde ve azalan sırada olmalı."); }
          }} />
      </div>) : <CardFace onClick={() => selected !== null && move(columnIndex)} />}
    </div>)}</div>
    <p className="card-help">Açık kartları büyükten küçüğe diz. Son hamleni Ctrl+Z ile bu oyun boyunca bir kez geri alabilirsin. As’a kadar tamamlanan 13 kartlık sıralar kaldırılır; her dağıtımda her sütuna bir kart gelir.</p>
    {won ? <VictoryCelebration onRestart={restart} /> : lost && <div className="spider-lost-overlay" role="alert" aria-live="assertive"><strong>Bu oyunu kaybettin</strong><button className="card-action" onClick={restart}>Yeni oyun</button></div>}
  </div>;
}

const TAROT_CARDS = [
  ["Deli", "Yeni bir başlangıç ve cesaret zamanı."], ["Büyücü", "Elindeki becerileri kullanarak bir fırsat yaratabilirsin."],
  ["Başrahibe", "Acele etmeden sezgilerini dinle."], ["İmparatoriçe", "Üretkenlik, bereket ve kendine iyi bakma öne çıkıyor."],
  ["İmparator", "Düzen kurmak ve sınırlarını belirlemek sana yardımcı olacak."], ["Aziz", "Deneyimli birinden alacağın tavsiye yol gösterebilir."],
  ["Âşıklar", "Önemli bir seçimde değerlerinle uyumlu olanı seç."], ["Savaş Arabası", "Kararlılık ve odakla ilerleyebilirsin."],
  ["Güç", "Sabır ve sakinlik, zor bir durumu yumuşatabilir."], ["Ermiş", "Kısa bir mola verip kendi önceliklerini gözden geçir."],
  ["Kader Çarkı", "Koşullar değişiyor; esnek kalmak yeni kapılar açabilir."], ["Adalet", "Dengeli bir karar için bilgileri dikkatle değerlendir."],
  ["Asılan Adam", "Bir konuya farklı açıdan bakmak çözümü görünür kılabilir."], ["Ölüm", "Bir dönemin kapanması yenisine yer açıyor."],
  ["Denge", "Orta yolu bulmak ve ölçülü davranmak iyi gelebilir."], ["Şeytan", "Seni yoran bir alışkanlığı fark edip sınır koy."],
  ["Kule", "Beklenmedik bir değişiklik planlarını yenilemene neden olabilir."], ["Yıldız", "Umut ve iyileşme için kendine zaman tanı."],
  ["Ay", "Belirsizlikte varsayım yerine açık bilgi aramaya çalış."], ["Güneş", "Güzel bir gelişmeyi paylaşmak için uygun bir dönem."],
  ["Mahkeme", "Geçmiş deneyimlerinden ders alıp yeni bir karar verebilirsin."], ["Dünya", "Emek verdiğin bir işi tamamlamak üzere olabilirsin."],
];

export function TarotReading() {
  const [reading, setReading] = useState<number[] | null>(null);
  const tapEvents = useMobileTap(draw);
  function draw() {
    const deck = Array.from({ length: TAROT_CARDS.length }, (_, index) => index);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    setReading(deck.slice(0, 3));
  }
  return <div className="tarot-box">
    <p className="tarot-intro">Üç kart seç: geçmiş, bugün ve önündeki olasılık. Bu yorumlar eğlence ve kişisel düşünme amaçlıdır.</p>
    <button className="card-action" {...tapEvents}>{reading ? "Yeni açılım yap" : "Kartları aç"}</button>
    {reading && <div className="tarot-reading">{reading.map((cardIndex, index) => <article className="tarot-card" key={cardIndex}>
      <span className="eyebrow">{["GEÇMİŞ", "BUGÜN", "OLASILIK"][index]}</span><div className="tarot-symbol">✧</div><h2>{TAROT_CARDS[cardIndex][0]}</h2><p>{TAROT_CARDS[cardIndex][1]}</p>
    </article>)}</div>}
  </div>;
}
