"use client";

import { useEffect, useRef, useState } from "react";
import { useMobileTap } from "@/components/mobile-tap";

const WIDTH = 960;
const HEIGHT = 420;
const WORLD = 3480;
const FLOOR = 356;
const ROUND_SECONDS = 20;
const LEVEL_TWO_SECONDS = 25;
const LEVEL_THREE_SECONDS = 50;
const ELECTRIC_FLOOR_Y = HEIGHT - 34;
const ELECTRIC_SHOCK_DURATION_MS = 4800;
const ELECTRIC_SHOCK_VISUAL_DURATION_MS = ELECTRIC_SHOCK_DURATION_MS - 2500;
const ELECTRIC_DEATH_AUDIO_DURATION_SECONDS = 1.5;
const ELECTRIC_DEATH_AUDIO_VOLUME = 0.42;
const SMOKE_EFFECT_DURATION_SECONDS = 1.8;
const LAVA_DEATH_EFFECT_DURATION_MS = 1600;
const PIT_RANGES: [number, number][] = [[720, 850], [1510, 1660], [2410, 2580]];
const LEVEL_TWO_PITS: [number, number][] = [[560, 710], [1320, 1470], [2110, 2260], [2920, 3070]];
const PLATFORMS = [
  { x: 275, y: 290, w: 110 }, { x: 505, y: 246, w: 112 }, { x: 760, y: 300, w: 120 },
  { x: 1070, y: 282, w: 130 }, { x: 1320, y: 238, w: 100 }, { x: 1570, y: 292, w: 125 },
  { x: 1850, y: 282, w: 120 }, { x: 2070, y: 235, w: 110 }, { x: 2470, y: 292, w: 130 },
  { x: 2750, y: 270, w: 130 }, { x: 3010, y: 230, w: 120 },
];
const LEVEL_TWO_PLATFORMS = [
  { x: 270, y: 286, w: 110 }, { x: 470, y: 238, w: 105 }, { x: 600, y: 292, w: 120 },
  { x: 880, y: 280, w: 120 }, { x: 1080, y: 236, w: 115 }, { x: 1340, y: 290, w: 120 },
  { x: 1580, y: 278, w: 130 }, { x: 1800, y: 230, w: 115 }, { x: 2130, y: 288, w: 120 },
  { x: 2380, y: 270, w: 115 }, { x: 2600, y: 228, w: 125 }, { x: 2940, y: 288, w: 120 },
  { x: 3160, y: 245, w: 115 },
];
const LEVEL_THREE_PLATFORMS = [
  { x: 185, y: 292, w: 155, range: 4, speed: 0.0012, phase: 0.2 },
  { x: 493, y: 282, w: 152, range: 4, speed: 0.001, phase: 1.8 },
  { x: 801, y: 292, w: 160, range: 4, speed: 0.00125, phase: 2.4 },
  { x: 1109, y: 282, w: 155, range: 4, speed: 0.00105, phase: 0.8 },
  { x: 1417, y: 292, w: 160, range: 4, speed: 0.0013, phase: 3.1 },
  { x: 1725, y: 282, w: 155, range: 4, speed: 0.0011, phase: 1.1 },
  { x: 2033, y: 292, w: 163, range: 4, speed: 0.0013, phase: 2.1 },
  { x: 2341, y: 282, w: 155, range: 4, speed: 0.001, phase: 4.2 },
  { x: 2649, y: 292, w: 160, range: 4, speed: 0.0012, phase: 0.5 },
  { x: 2957, y: 282, w: 155, range: 4, speed: 0.0011, phase: 3.8 },
  { x: 3265, y: 292, w: 173, range: 4, speed: 0.0009, phase: 2.7 },
];
const LEVEL_THREE_COINS = LEVEL_THREE_PLATFORMS.map(({ x, y, w }) => ({ x: x + w / 2, y: y - 22, taken: false }));
const ELECTRIC_SKULLS = [
  { x: 520, range: 250, speed: 0.0009, phase: 0.2 },
  { x: 1660, range: 300, speed: 0.00075, phase: 2.4 },
  { x: 2780, range: 270, speed: 0.00085, phase: 4.1 },
];
const LEVEL_TWO_FIRE_BARS = [
  { x: 980, y: 292, length: 112, speed: 1.75 },
  { x: 1700, y: 292, length: 120, speed: -1.6 },
  { x: 2510, y: 292, length: 114, speed: 1.9 },
  { x: 3220, y: 286, length: 112, speed: -1.7 },
];
const COINS = [
  [180, 300], [320, 250], [550, 204], [805, 254], [965, 300], [1125, 240], [1360, 196],
  [1600, 250], [1905, 240], [2120, 192], [2300, 300], [2515, 250], [2800, 230], [3060, 190], [3225, 300],
].map(([x, y]) => ({ x, y, taken: false }));
const LEVEL_TWO_COINS = [
  [170, 290], [320, 245], [500, 198], [650, 250], [920, 235], [1120, 194],
  [1390, 240], [1635, 232], [1840, 190], [2180, 240], [2435, 224], [2650, 188],
  [2990, 240], [3200, 205], [3370, 285],
].map(([x, y]) => ({ x, y, taken: false }));

type Status = "ready" | "playing" | "won" | "lost" | "timeout";
type Level = 1 | 2 | 3;
type Player = { x: number; y: number; vx: number; vy: number; w: number; h: number; grounded: boolean };
type SplashRipple = { x: number; y: number; startAt: number };
type SmokeEffect = { x: number; y: number; startAt: number; fallFromY?: number };
type ShockEffect = { x: number; y: number; startAt: number };
type MovingPlatform = { x: number; y: number; w: number };
type SwingSeat = { x: number; y: number; anchorX: number; anchorY: number };

function getLevelThreePlatforms(now: number): MovingPlatform[] {
  return LEVEL_THREE_PLATFORMS.map((platform) => ({
    x: platform.x + Math.sin(now * platform.speed + platform.phase) * platform.range,
    y: platform.y,
    w: platform.w,
  }));
}

function getLevelThreeSwings(now: number): SwingSeat[] {
  return getLevelThreePlatforms(now).slice(0, -1).map((platform, index) => {
    const anchorX = platform.x + platform.w;
    const anchorY = platform.y;
    const angle = Math.sin(now * 0.0022 + index * 1.7) * 0.9;
    const length = 88;
    return {
      x: anchorX + Math.sin(angle) * length,
      y: anchorY + Math.cos(angle) * length,
      anchorX,
      anchorY,
    };
  });
}

function getElectricSkullPositions(now: number) {
  return ELECTRIC_SKULLS.map((skull) => ({
    x: skull.x + Math.sin(now * skull.speed + skull.phase) * skull.range,
    y: ELECTRIC_FLOOR_Y - 19 + Math.sin(now * skull.speed * 2 + skull.phase) * 3,
  }));
}

function getLevelTwoMagmaSurfaceY(x: number, now: number) {
  return FLOOR + 23 + Math.sin(now * 0.004 + x * 0.055) * 5 + Math.sin(now * 0.007 + x * 0.12) * 2;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared)) : 0;
  return Math.hypot(px - (x1 + amount * dx), py - (y1 + amount * dy));
}

function drawScene(ctx: CanvasRenderingContext2D, player: Player, camera: number, coins: typeof COINS, score: number, now: number, ripple: SplashRipple | null, smoke: SmokeEffect | null, shock: ShockEffect | null, level: Level, wings: boolean) {
  const pits = level === 1 ? PIT_RANGES : level === 2 ? LEVEL_TWO_PITS : [];
  const platforms = level === 1 ? PLATFORMS : level === 2 ? LEVEL_TWO_PLATFORMS : [];
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#8dd5ee");
  sky.addColorStop(1, "#dff1d1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 7; i++) {
    const x = ((i * 210 - camera * .22) % (WIDTH + 180) + WIDTH + 180) % (WIDTH + 180) - 70;
    const y = 58 + (i % 3) * 38;
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.beginPath();
    ctx.ellipse(x, y, 37, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 23, y - 7, 25, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 46, y, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-camera, 0);
  for (let i = 0; i < 13; i++) {
    const x = i * 310 - 40;
    ctx.fillStyle = i % 2 ? "#79b999" : "#69ad90";
    ctx.beginPath();
    ctx.ellipse(x + 130, FLOOR + 18, 178, 102, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#a66e45";
  for (let x = 0; x < WORLD; x += 64) {
    let segments: [number, number][] = level === 3
      ? (x < 128 ? [[x, Math.min(x + 64, 128)]] : x >= WORLD - 160 ? [[Math.max(x, WORLD - 160), Math.min(x + 64, WORLD)]] : [])
      : [[x, Math.min(x + 64, WORLD)]];
    for (const [pitStart, pitEnd] of pits) {
      segments = segments.flatMap(([left, right]) => {
        if (right <= pitStart || left >= pitEnd) return [[left, right]];
        const remaining: [number, number][] = [];
        if (left < pitStart) remaining.push([left, pitStart]);
        if (right > pitEnd) remaining.push([pitEnd, right]);
        return remaining;
      });
    }
    for (const [left, right] of segments) {
      const width = right - left;
      ctx.fillStyle = "#a66e45";
      ctx.fillRect(left, FLOOR, width, HEIGHT - FLOOR);
      ctx.fillStyle = "#75a94e";
      ctx.fillRect(left, FLOOR, width, 10);
      if (width > 24) {
        ctx.fillStyle = "#a66e45";
        ctx.fillRect(left + 8, FLOOR + 20, 4, 4);
        if (width > 48) ctx.fillRect(right - 18, FLOOR + 38, 4, 4);
      }
    }
  }

  if (level === 3) {
    ctx.save();
    ctx.shadowColor = "#54f5ff";
    ctx.shadowBlur = 18 + Math.sin(now * 0.02) * 5;
    ctx.fillStyle = "#167fa4";
    ctx.fillRect(0, ELECTRIC_FLOOR_Y, WORLD, HEIGHT - ELECTRIC_FLOOR_Y);
    const colorMix = (Math.sin(now * 0.00035) + 1) / 2;
    const red = Math.round(255 * (1 - colorMix) + 52 * colorMix);
    const green = Math.round(54 * (1 - colorMix) + 132 * colorMix);
    const blue = Math.round(72 * (1 - colorMix) + 255 * colorMix);
    const electricColor = `rgb(${red}, ${green}, ${blue})`;
    const blink = 0.45 + (Math.sin(now * 0.002) + 1) * 0.275;
    ctx.globalAlpha = blink;
    ctx.strokeStyle = electricColor;
    ctx.shadowColor = electricColor;
    ctx.shadowBlur = 9;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = 0; x <= WORLD; x += 12) {
      const zigzagY = ELECTRIC_FLOOR_Y + (Math.floor(x / 12) % 2 ? 2.5 : -2.5);
      if (x === 0) ctx.moveTo(x, zigzagY);
      else ctx.lineTo(x, zigzagY);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let x = 15; x < WORLD; x += 48) {
      const y = ELECTRIC_FLOOR_Y + 5 + Math.sin(now * 0.008 + x * 0.08) * 10;
      ctx.strokeStyle = electricColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, ELECTRIC_FLOOR_Y);
      ctx.lineTo(x + 4, ELECTRIC_FLOOR_Y + 5);
      ctx.lineTo(x - 3 + Math.sin(now * 0.006 + x) * 3, y);
      ctx.lineTo(x + 7, ELECTRIC_FLOOR_Y + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const skull of getElectricSkullPositions(now)) {
      ctx.save();
      ctx.translate(skull.x, skull.y);
      ctx.shadowColor = "#ff2438";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ef2639";
      ctx.beginPath();
      ctx.arc(0, -3, 13, Math.PI, 0);
      ctx.lineTo(13, 7);
      ctx.lineTo(9, 12);
      ctx.lineTo(-9, 12);
      ctx.lineTo(-13, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-8, 8, 16, 7);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#34151b";
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-2, -4);
      ctx.lineTo(-5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -4);
      ctx.lineTo(8, -4);
      ctx.lineTo(5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-5, 9, 2, 5);
      ctx.fillRect(-1, 9, 2, 5);
      ctx.fillRect(3, 9, 2, 5);
      ctx.restore();
    }
    ctx.restore();
  }

  for (const [start, end] of pits) {
    if (level === 2) {
      const surfaceY = FLOOR + 23;
      ctx.save();
      ctx.beginPath();
      ctx.rect(start, FLOOR, end - start, HEIGHT - FLOOR);
      ctx.clip();

      const magmaDepth = ctx.createLinearGradient(0, surfaceY, 0, HEIGHT);
      magmaDepth.addColorStop(0, "#fff06a");
      magmaDepth.addColorStop(0.12, "#ff8a19");
      magmaDepth.addColorStop(0.42, "#d9230b");
      magmaDepth.addColorStop(1, "#471018");
      ctx.fillStyle = magmaDepth;
      ctx.fillRect(start, FLOOR, end - start, HEIGHT - FLOOR);

      const lavaSurface = (x: number) => getLevelTwoMagmaSurfaceY(x, now);
      ctx.beginPath();
      ctx.moveTo(start, HEIGHT);
      for (let x = start; x <= end; x += 6) ctx.lineTo(x, lavaSurface(x));
      ctx.lineTo(end, HEIGHT);
      ctx.closePath();
      ctx.fillStyle = "#ff5a0a";
      ctx.fill();

      ctx.beginPath();
      for (let x = start; x <= end; x += 6) {
        const y = lavaSurface(x);
        if (x === start) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#fff18a";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff4a0a";
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      for (let x = start + 10; x < end - 5; x += 24) {
        const phase = now * 0.003 + x * 0.08;
        const flameHeight = 13 + (Math.sin(phase) + 1) * 12;
        const flameX = x + Math.sin(phase * 1.7) * 4;
        const baseY = lavaSurface(x) + 3;
        ctx.beginPath();
        ctx.moveTo(flameX - 8, baseY + 8);
        ctx.quadraticCurveTo(flameX - 3, baseY - flameHeight * 0.45, flameX + Math.sin(phase) * 3, baseY - flameHeight);
        ctx.quadraticCurveTo(flameX + 5, baseY - flameHeight * 0.35, flameX + 9, baseY + 8);
        ctx.closePath();
        const flame = ctx.createLinearGradient(0, baseY - flameHeight, 0, baseY + 8);
        flame.addColorStop(0, "#fff6a0");
        flame.addColorStop(0.45, "#ffb51f");
        flame.addColorStop(1, "rgba(255,57,7,.2)");
        ctx.fillStyle = flame;
        ctx.fill();
      }

      for (let x = start + 18; x < end - 8; x += 41) {
        const bubbleY = surfaceY + 10 + Math.sin(now * 0.005 + x) * 9;
        ctx.fillStyle = "rgba(255,219,75,.8)";
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(now * 0.002 + x) * 5, bubbleY, 3 + (Math.sin(now * 0.004 + x) + 1) * 2, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      continue;
    }
    const surfaceY = (x: number) => {
      const edge = Math.sin(((x - start) / (end - start)) * Math.PI);
      return FLOOR + Math.sin(now * 0.006 + x * 0.045) * 15 * edge;
    };
    ctx.fillStyle = "#238da5";
    ctx.beginPath();
    ctx.moveTo(start, HEIGHT);
    for (let x = start; x <= end; x += 10) {
      ctx.lineTo(x, surfaceY(x));
    }
    ctx.lineTo(end, HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(190,245,240,.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = start; x < end; x += 6) {
      const y = surfaceY(x);
      if (x === start) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(end, surfaceY(end));
    ctx.stroke();
    ctx.strokeStyle = "rgba(228,255,252,.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = start; x < end; x += 6) {
      const y = FLOOR + 22 + Math.sin(now * 0.004 + x * 0.052) * 12;
      if (x === start) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(end, FLOOR + 22 + Math.sin(now * 0.004 + end * 0.052) * 12);
    ctx.stroke();
    ctx.strokeStyle = "rgba(228,255,252,.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = start; x < end; x += 7) {
      const y = FLOOR + 43 + Math.sin(now * 0.005 + x * 0.04) * 10;
      if (x === start) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(end, FLOOR + 43 + Math.sin(now * 0.005 + end * 0.04) * 10);
    ctx.stroke();
  }

  for (const platform of platforms) {
    ctx.fillStyle = "#a66e45";
    ctx.fillRect(platform.x, platform.y, platform.w, 18);
    ctx.fillStyle = "#75a94e";
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
    ctx.fillStyle = "#d19b5f";
    for (let x = platform.x + 12; x < platform.x + platform.w; x += 28) ctx.fillRect(x, platform.y + 8, 3, 4);
  }

  if (level === 3) {
    const movingPlatforms = getLevelThreePlatforms(now);
    const swings = getLevelThreeSwings(now);
    for (let i = 0; i < movingPlatforms.length; i++) {
      const platform = movingPlatforms[i];
      const swing = swings[i];
      ctx.fillStyle = "#9a6545";
      ctx.fillRect(platform.x, platform.y, platform.w, 16);
      ctx.fillStyle = "#d9ef63";
      ctx.fillRect(platform.x, platform.y, platform.w, 5);
      if (!swing) continue;
      ctx.fillStyle = "#d5c68a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(swing.anchorX - 5, swing.anchorY - 2);
      ctx.lineTo(swing.x, swing.y);
      ctx.moveTo(swing.anchorX + 5, swing.anchorY - 2);
      ctx.lineTo(swing.x + 23, swing.y);
      ctx.stroke();
      ctx.fillStyle = "#5b4734";
      ctx.fillRect(swing.x - 4, swing.y - 1, 36, 7);
      ctx.fillStyle = "#dfc16b";
      ctx.fillRect(swing.x - 5, swing.y - 3, 39, 3);
    }
  }

  if (level === 2) {
    for (const bar of LEVEL_TWO_FIRE_BARS) {
      const angle = now * bar.speed / 1000;
      const dx = Math.cos(angle) * bar.length / 2;
      const dy = Math.sin(angle) * bar.length / 2;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff4b1f";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#f45127";
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(bar.x - dx, bar.y - dy);
      ctx.lineTo(bar.x + dx, bar.y + dy);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffe27a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bar.x - dx, bar.y - dy);
      ctx.lineTo(bar.x + dx, bar.y + dy);
      ctx.stroke();
      for (const end of [-1, 1]) {
        ctx.fillStyle = "#f45127";
        ctx.beginPath();
        ctx.arc(bar.x + dx * end, bar.y + dy * end, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff0a0";
        ctx.beginPath();
        ctx.arc(bar.x + dx * end, bar.y + dy * end, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#563d35";
      ctx.beginPath();
      ctx.arc(bar.x, bar.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const coin of coins) {
    if (coin.taken) continue;
    ctx.fillStyle = "#ffd84f";
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e5a928";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff4ad";
    ctx.fillRect(coin.x - 2, coin.y - 6, 2, 5);
  }

  // Original runner character drawn from simple canvas shapes.
  const deathEffectActive = smoke !== null || shock !== null;
  const deathShake = smoke
    ? Math.max(0, 1 - (now - smoke.startAt) / (SMOKE_EFFECT_DURATION_SECONDS * 1000))
    : shock
      ? Math.max(0, 1 - (now - shock.startAt) / ELECTRIC_SHOCK_VISUAL_DURATION_MS)
      : 0;
  ctx.save();
  if (deathEffectActive) {
    ctx.translate(Math.sin(now * 0.062) * 5 * deathShake + Math.sin(now * 0.13) * 2, Math.cos(now * 0.079) * 3.5 * deathShake);
    ctx.shadowColor = smoke ? "#ff4a12" : "#22dfff";
    ctx.shadowBlur = 12 + Math.sin(now * 0.075) * 7;
  }
  if (wings) {
    ctx.fillStyle = "#f2f5df";
    ctx.strokeStyle = "#d9efb5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + 8, player.y + 16);
    ctx.quadraticCurveTo(player.x - 30, player.y - 8 + Math.sin(now * 0.025) * 9, player.x - 20, player.y + 29);
    ctx.quadraticCurveTo(player.x - 5, player.y + 25, player.x + 10, player.y + 27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x + 22, player.y + 16);
    ctx.quadraticCurveTo(player.x + 60, player.y - 8 + Math.sin(now * 0.025) * 9, player.x + 50, player.y + 29);
    ctx.quadraticCurveTo(player.x + 35, player.y + 25, player.x + 20, player.y + 27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#49362d";
  ctx.fillRect(player.x + 3, player.y + player.h - 5, 10, 6);
  ctx.fillRect(player.x + 17, player.y + player.h - 5, 10, 6);
  ctx.fillStyle = "#4d8c72";
  ctx.fillRect(player.x + 5, player.y + 14, 20, 15);
  ctx.fillStyle = "#e5ad77";
  ctx.fillRect(player.x + 7, player.y + 2, 17, 15);
  ctx.fillStyle = "#255c49";
  ctx.fillRect(player.x + 3, player.y, 24, 6);
  ctx.fillRect(player.x + 8, player.y - 4, 17, 5);
  ctx.fillStyle = "#24372f";
  ctx.fillRect(player.x + 19, player.y + 8, 2, 3);
  ctx.fillStyle = "#e9ed91";
  ctx.fillRect(player.x + 8, player.y + 18, 5, 4);
  ctx.restore();

  if (smoke) {
    const age = (now - smoke.startAt) / 1000;
    if (age >= 0 && age < SMOKE_EFFECT_DURATION_SECONDS) {
      ctx.save();
      for (let i = 0; i < 24; i++) {
        const puffAge = age - i * 0.075;
        if (puffAge < 0 || puffAge > 0.95) continue;
        const angle = i * 2.399;
        const spread = 4 + puffAge * 20 + (i % 4) * 4;
        const x = smoke.x + Math.cos(angle) * spread + Math.sin(puffAge * 5 + i) * 5;
        const y = smoke.y + 9 - puffAge * 76 + Math.sin(angle) * 5;
        const radius = 15 + puffAge * 22 + (i % 5) * 4;
        const fadeIn = Math.min(1, puffAge / 0.08);
        const alpha = Math.max(0, 0.82 * (1 - age / SMOKE_EFFECT_DURATION_SECONDS) * fadeIn);
        const cloud = ctx.createRadialGradient(x, y, 1, x, y, radius);
        cloud.addColorStop(0, `rgba(42,35,31,${alpha})`);
        cloud.addColorStop(0.58, `rgba(76,69,63,${alpha * 0.9})`);
        cloud.addColorStop(1, "rgba(130,122,112,0)");
        ctx.fillStyle = cloud;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (shock) {
    const age = (now - shock.startAt) / 1000;
    if (age >= 0 && age < ELECTRIC_SHOCK_VISUAL_DURATION_MS / 1000) {
      ctx.save();
      ctx.globalAlpha = 1 - age / (ELECTRIC_SHOCK_VISUAL_DURATION_MS / 1000);
      ctx.shadowColor = "#22dfff";
      ctx.shadowBlur = 18;
      const scale = 1 + Math.min(age, 0.5) * 0.45;
      const flicker = Math.sin(now * 0.055) * 2;
      ctx.translate(shock.x + flicker, shock.y - player.h / 2 - 24);
      for (let i = 0; i < 5; i++) {
        const angle = (i - 2) * Math.PI / 6;
        ctx.save();
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.fillStyle = "#9afaff";
        ctx.beginPath();
        ctx.moveTo(0, -17);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-2, -4);
        ctx.lineTo(-5, 11);
        ctx.lineTo(7, -6);
        ctx.lineTo(2, -6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  if (ripple) {
    const age = (now - ripple.startAt) / 1000;
    if (age >= 0 && age < 1.05) {
      ctx.save();
      ctx.globalAlpha = 1 - age / 1.05;
      ctx.strokeStyle = "#d6fff5";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const ringAge = Math.max(0, age - i * 0.14);
      const radius = 9 + ringAge * 140;
        ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  const flagX = 3370;
  ctx.fillStyle = "#55483c";
  ctx.fillRect(flagX, 210, 6, FLOOR - 210);
  ctx.fillStyle = "#e8dd78";
  ctx.beginPath();
  ctx.moveTo(flagX + 6, 212);
  ctx.lineTo(flagX + 52, 226);
  ctx.lineTo(flagX + 6, 242);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(25,33,31,.84)";
  ctx.fillRect(18, 16, 220, 42);
  ctx.fillStyle = "#f4f5ee";
  ctx.font = "700 16px Arial";
  ctx.fillText(`BÖLÜM ${level}  ·  ALTIN: ${score}`, 34, 43);
}

export function PlatformGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
 const keys = useRef(new Set<string>());
  const player = useRef<Player>({ x: 54, y: FLOOR - 38, vx: 0, vy: 0, w: 30, h: 38, grounded: true });
  const coins = useRef(COINS.map((coin) => ({ ...coin })));
  const scoreRef = useRef(0);
  const finished = useRef(false);
  const jumpWasDown = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const splashAudio = useRef<HTMLAudioElement | null>(null);
  const burnAudioBuffer = useRef<AudioBuffer | null>(null);
  const burnAudioBufferPromise = useRef<Promise<AudioBuffer> | null>(null);
  const electricAudio = useRef<HTMLAudioElement | null>(null);
  const deathSoundPlayed = useRef(false);
  const splashStopTimer = useRef<number | null>(null);
  const splashRipple = useRef<SplashRipple | null>(null);
  const smokeEffect = useRef<SmokeEffect | null>(null);
  const shockEffect = useRef<ShockEffect | null>(null);
  const movingSupport = useRef<number | null>(null);
  const lastPlatformIndex = useRef<number | null>(null);
  const swingUsedFromPlatform = useRef<number | null>(null);
  const flightMode = useRef(false);
  const deadline = useRef(0);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [level, setLevel] = useState<Level>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualFullscreen, setManualFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === gameRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("mesai-runner-best") || 0)); } catch { /* local storage may be disabled */ }
  }, []);
  useEffect(() => {
    const sound = new Audio("/elektrik%20sesi-1.mp3");
    sound.preload = "auto";
    sound.load();
    electricAudio.current = sound;
    return () => {
      sound.pause();
      electricAudio.current = null;
    };
  }, []);
  useEffect(() => () => { void audio.current?.close(); }, []);
  useEffect(() => {
    const sound = new Audio("/suya%20atlama%20sesi.mp3");
    sound.preload = "auto";
    splashAudio.current = sound;
    return () => {
      sound.pause();
      if (splashStopTimer.current !== null) window.clearTimeout(splashStopTimer.current);
      splashAudio.current = null;
    };
  }, []);

  function playCoinSound() {
    const context = audio.current;
    if (!context || context.state !== "running") return;
    const audioContext: AudioContext = context;
    const startAt = audioContext.currentTime;
    function ring(frequency: number, at: number, peak: number, tail: number, type: OscillatorType) {
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.015, at + 0.16);
      volume.gain.setValueAtTime(0.0001, at);
      volume.gain.exponentialRampToValueAtTime(peak, at + 0.008);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + tail);
      oscillator.connect(volume);
      volume.connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + tail + 0.01);
    }
    [920, 1160, 1510].forEach((frequency, index) => {
      const at = startAt + index * 0.07;
      ring(frequency, at, 0.095, 0.68, "sine");
      ring(frequency * 2.76, at + 0.006, 0.024, 0.48, "triangle");
    });
  }

  function playWinSound() {
    const context = audio.current;
    if (!context || context.state !== "running") return;
    const audioContext: AudioContext = context;
    const startAt = audioContext.currentTime;
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-4, startAt);
    limiter.knee.setValueAtTime(0, startAt);
    limiter.ratio.setValueAtTime(12, startAt);
    limiter.attack.setValueAtTime(0.003, startAt);
    limiter.release.setValueAtTime(0.22, startAt);
    limiter.connect(audioContext.destination);
    const notes = [
      { frequency: 523.25, delay: 0, length: 0.34 },
      { frequency: 659.25, delay: 0.13, length: 0.34 },
      { frequency: 783.99, delay: 0.26, length: 0.38 },
      { frequency: 1046.5, delay: 0.42, length: 0.78 },
      { frequency: 783.99, delay: 0.42, length: 0.78 },
      { frequency: 659.25, delay: 0.42, length: 0.78 },
    ];
    for (const note of notes) {
      const at = startAt + note.delay;
      const tone = audioContext.createOscillator();
      const overtone = audioContext.createOscillator();
      const volume = audioContext.createGain();
      const overtoneVolume = audioContext.createGain();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(note.frequency, at);
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(note.frequency * 2, at);
      volume.gain.setValueAtTime(0.0001, at);
      volume.gain.exponentialRampToValueAtTime(1.125, at + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + note.length);
      overtoneVolume.gain.setValueAtTime(0.0001, at);
      overtoneVolume.gain.exponentialRampToValueAtTime(0.27, at + 0.03);
      overtoneVolume.gain.exponentialRampToValueAtTime(0.0001, at + note.length * 0.8);
      tone.connect(volume);
      overtone.connect(overtoneVolume);
      volume.connect(limiter);
      overtoneVolume.connect(limiter);
      tone.start(at);
      overtone.start(at);
      tone.stop(at + note.length + 0.01);
      overtone.stop(at + note.length + 0.01);
    }
  }

  function playSplashSound() {
    const sound = splashAudio.current;
    if (!sound) return;
    if (splashStopTimer.current !== null) window.clearTimeout(splashStopTimer.current);
    sound.pause();
    sound.currentTime = 0;
    void sound.play().catch(() => {});
    splashStopTimer.current = window.setTimeout(() => {
      sound.pause();
      sound.currentTime = 0;
      splashStopTimer.current = null;
    }, 3000);
  }

  function loadBurnAudio(context: AudioContext) {
    if (burnAudioBuffer.current) return Promise.resolve(burnAudioBuffer.current);
    if (!burnAudioBufferPromise.current) {
      burnAudioBufferPromise.current = fetch("/yanma%20sesi.wav")
        .then((response) => {
          if (!response.ok) throw new Error("Yanma sesi yüklenemedi");
          return response.arrayBuffer();
        })
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          burnAudioBuffer.current = buffer;
          return buffer;
        });
    }
    return burnAudioBufferPromise.current;
  }

  function prepareAudio() {
    try {
      const context = audio.current ??= new AudioContext();
      void context.resume();
      void loadBurnAudio(context).catch(() => {});
    } catch { /* Audio is optional; the game remains playable without it. */ }
  }

  function playBurnSound() {
    const context = audio.current;
    if (!context) return;
    const play = (buffer: AudioBuffer) => {
      if (context.state !== "running") return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(2, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    };
    void loadBurnAudio(context).then(play).catch(() => {});
  }

  function playElectricShock() {
    const sound = electricAudio.current;
    if (!sound) return;
    sound.pause();
    sound.currentTime = 0;
    sound.playbackRate = 1;
    sound.volume = ELECTRIC_DEATH_AUDIO_VOLUME;
    void sound.play().then(() => {
      window.setTimeout(() => {
        sound.pause();
        sound.currentTime = 0;
      }, ELECTRIC_DEATH_AUDIO_DURATION_SECONDS * 1000);
    }).catch(() => {
      // Keep the shock sound audible even if the browser blocks HTMLAudio playback.
      try {
        audio.current ??= new AudioContext();
        const context = audio.current;
        void context.resume().then(() => {
          if (context.state !== "running") return;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(180, context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(42, context.currentTime + 0.55);
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.126, context.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + ELECTRIC_DEATH_AUDIO_DURATION_SECONDS);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + ELECTRIC_DEATH_AUDIO_DURATION_SECONDS);
        }).catch(() => {});
      } catch { /* Audio is optional; the game remains playable without it. */ }
    });
  }

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (status !== "playing") return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW"].includes(event.code) || (event.ctrlKey && ["KeyF", "KeyA"].includes(event.code))) event.preventDefault();
      keys.current.add(event.code);
      const controlHeld = event.ctrlKey || keys.current.has("ControlLeft") || keys.current.has("ControlRight");
      const chordComplete = (event.code === "KeyF" && keys.current.has("KeyA")) || (event.code === "KeyA" && keys.current.has("KeyF"));
      if (level === 3 && controlHeld && chordComplete) flightMode.current = true;
    }
    function up(event: KeyboardEvent) { keys.current.delete(event.code); }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [status, level]);

  useEffect(() => {
    if (status !== "lost") return;
    function restart(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      if (level === 2) startLevelTwo();
      else if (level === 3) startLevelThree();
      else start();
    }
    window.addEventListener("keydown", restart);
    return () => window.removeEventListener("keydown", restart);
  }, [status, level]);

  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const context: CanvasRenderingContext2D = ctx;
    let frame = 0;
    let previous = performance.now();
    let lastShownSecond = level === 1 ? ROUND_SECONDS : level === 2 ? LEVEL_TWO_SECONDS : LEVEL_THREE_SECONDS;

    function tick(now: number) {
      const seconds = Math.max(0, Math.ceil((deadline.current - now) / 1000));
      if (seconds !== lastShownSecond) {
        lastShownSecond = seconds;
        setTimeLeft(seconds);
      }
      if (seconds === 0) { finish("timeout"); return; }
      if (shockEffect.current) {
        const p = player.current;
        const camera = Math.max(0, Math.min(WORLD - WIDTH, p.x - WIDTH * .28));
        drawScene(context, p, camera, coins.current, scoreRef.current, now, splashRipple.current, smokeEffect.current, shockEffect.current, level, level === 3 && flightMode.current);
        if (now - shockEffect.current.startAt >= ELECTRIC_SHOCK_VISUAL_DURATION_MS) { finish("lost"); return; }
        frame = requestAnimationFrame(tick);
        return;
      }
      if (smokeEffect.current) {
        const p = player.current;
        const camera = Math.max(0, Math.min(WORLD - WIDTH, p.x - WIDTH * .28));
        if (smokeEffect.current.fallFromY !== undefined) {
          const fallProgress = Math.min(1, (now - smokeEffect.current.startAt) / 750);
          const easedProgress = 1 - (1 - fallProgress) ** 3;
          const targetY = getLevelTwoMagmaSurfaceY(smokeEffect.current.x, now) - p.h;
          p.y = smokeEffect.current.fallFromY + (targetY - smokeEffect.current.fallFromY) * easedProgress;
        }
        drawScene(context, p, camera, coins.current, scoreRef.current, now, splashRipple.current, smokeEffect.current, null, level, false);
        if (now - smokeEffect.current.startAt >= (smokeEffect.current.fallFromY === undefined ? SMOKE_EFFECT_DURATION_SECONDS * 1000 : LAVA_DEATH_EFFECT_DURATION_MS)) { finish("lost"); return; }
        frame = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min((now - previous) / 1000, .035);
      previous = now;
      const p = player.current;
      if (level === 3 && !flightMode.current && p.grounded && movingSupport.current !== null) {
        const support = movingSupport.current;
        const beforeTime = now - dt * 1000;
        const beforePlatform = getLevelThreePlatforms(beforeTime)[support];
        const afterPlatform = getLevelThreePlatforms(now)[support];
        if (beforePlatform && afterPlatform) p.x += afterPlatform.x - beforePlatform.x;
        else if (support >= 100) {
          const index = support - 100;
          const beforeSwing = getLevelThreeSwings(beforeTime)[index];
          const afterSwing = getLevelThreeSwings(now)[index];
          if (beforeSwing && afterSwing) {
            p.x += afterSwing.x - beforeSwing.x;
            p.y += afterSwing.y - beforeSwing.y;
          }
        }
      }
      const flying = level === 3 && flightMode.current;
      const left = flying ? keys.current.has("ArrowLeft") : keys.current.has("ArrowLeft") || keys.current.has("KeyA");
      const right = flying ? keys.current.has("ArrowRight") : keys.current.has("ArrowRight") || keys.current.has("KeyD");
      const jumping = keys.current.has("Space") || keys.current.has("ArrowUp") || keys.current.has("KeyW");
      const oldBottom = p.y + p.h;
      if (flying) {
        p.vx = (Number(right) - Number(left)) * 310;
        p.x = Math.max(0, Math.min(WORLD - p.w, p.x + p.vx * dt));
        const up = keys.current.has("ArrowUp");
        const down = keys.current.has("ArrowDown");
        p.y = Math.max(38, Math.min(ELECTRIC_FLOOR_Y - p.h, p.y + (Number(down) - Number(up)) * 260 * dt));
        p.vy = 0;
        p.grounded = false;
        movingSupport.current = null;
        jumpWasDown.current = jumping;
      } else {
        p.vx = (Number(right) - Number(left)) * 245;
        p.x = Math.max(0, Math.min(WORLD - p.w, p.x + p.vx * dt));
        if (jumping && !jumpWasDown.current && p.grounded) {
          if (level === 3 && movingSupport.current !== null && movingSupport.current < 100) {
            lastPlatformIndex.current = movingSupport.current;
          }
          p.vy = -520;
          p.grounded = false;
          movingSupport.current = null;
        }
        jumpWasDown.current = jumping;
        p.vy += 1320 * dt;
        p.y += p.vy * dt;
        p.grounded = false;
        movingSupport.current = null;
      }
      const centerX = p.x + p.w / 2;
      const pits = level === 1 ? PIT_RANGES : level === 2 ? LEVEL_TWO_PITS : [];
      const inPit = pits.some(([a, b]) => centerX > a && centerX < b);
      const enteredPit = inPit && p.vy > 0 && oldBottom <= FLOOR + 2 && p.y + p.h > FLOOR + 2;
      const fallingIntoPit = inPit && p.vy > 0 && p.y + p.h > FLOOR + 2;
      const safeGround = level !== 3 || centerX < 128 || centerX > WORLD - 160;
      if (!flying && safeGround && !inPit && oldBottom <= FLOOR && p.y + p.h >= FLOOR) { p.y = FLOOR - p.h; p.vy = 0; p.grounded = true;       }
      if (fallingIntoPit && level === 1 && !splashRipple.current) {
        splashRipple.current = { x: centerX, y: FLOOR + 5, startAt: now };
        playSplashSound();
      }
      const activePlatforms = level === 1 ? PLATFORMS : level === 2 ? LEVEL_TWO_PLATFORMS : getLevelThreePlatforms(now);
      if (level === 3) {
        coins.current.forEach((coin, index) => {
          const platform = activePlatforms[index];
          if (!coin.taken && platform) {
            coin.x = platform.x + platform.w / 2;
            coin.y = platform.y - 22;
          }
        });
      }
      for (let index = 0; index < activePlatforms.length; index++) {
        const platform = activePlatforms[index];
        const allowedLevelThreeLanding = level !== 3 || lastPlatformIndex.current === null || index === lastPlatformIndex.current || swingUsedFromPlatform.current === lastPlatformIndex.current;
        if (!flying && allowedLevelThreeLanding && p.vy >= 0 && oldBottom <= platform.y && p.y + p.h >= platform.y && p.x + p.w > platform.x && p.x < platform.x + platform.w) {
          p.y = platform.y - p.h; p.vy = 0; p.grounded = true;
          if (level === 3) {
            if (lastPlatformIndex.current !== null && index !== lastPlatformIndex.current) swingUsedFromPlatform.current = null;
            lastPlatformIndex.current = index;
            movingSupport.current = index;
          }
        }
      }
      if (level === 3) {
        const swings = getLevelThreeSwings(now);
        const previousSwings = getLevelThreeSwings(now - dt * 1000);
        for (let index = 0; index < swings.length; index++) {
          const swing = swings[index];
          const seatTop = swing.y - 3;
          const previousSwing = previousSwings[index];
          const previousSeatTop = previousSwing.y - 3;
          const sweptSeatTop = Math.min(seatTop, previousSeatTop);
          const sweptSeatBottom = Math.max(seatTop, previousSeatTop);
          const sweptSeatLeft = Math.min(swing.x, previousSwing.x) - 12;
          const sweptSeatRight = Math.max(swing.x, previousSwing.x) + 44;
          const swingMatchesSource = lastPlatformIndex.current === null ? index === 0 : index === lastPlatformIndex.current;
          const crossedSeatHeight = p.y <= sweptSeatBottom + p.h + 8 && p.y + p.h >= sweptSeatTop - 8;
          const overlapsSeat = p.x + p.w > sweptSeatLeft && p.x < sweptSeatRight;
          if (!flying && swingMatchesSource && p.vy >= 0 && crossedSeatHeight && overlapsSeat) {
            p.y = seatTop - p.h;
            p.vy = 0;
            p.grounded = true;
            movingSupport.current = 100 + index;
            lastPlatformIndex.current = index;
            swingUsedFromPlatform.current = index;
          }
        }
      }
      for (const coin of coins.current) {
        if (!coin.taken && Math.abs(centerX - coin.x) < 24 && Math.abs(p.y + p.h / 2 - coin.y) < 27) {
          coin.taken = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          playCoinSound();
        }
      }

      const camera = Math.max(0, Math.min(WORLD - WIDTH, p.x - WIDTH * .28));
      const touchingFireBar = level === 2 && LEVEL_TWO_FIRE_BARS.some((bar) => {
        const angle = now * bar.speed / 1000;
        const dx = Math.cos(angle) * bar.length / 2;
        const dy = Math.sin(angle) * bar.length / 2;
        return distanceToSegment(centerX, p.y + p.h / 2, bar.x - dx, bar.y - dy, bar.x + dx, bar.y + dy) < 25;
      });
      if (level === 2 && (enteredPit || touchingFireBar)) {
        smokeEffect.current = { x: centerX, y: p.y + p.h / 2, startAt: now, ...(enteredPit ? { fallFromY: p.y } : {}) };
        if (!deathSoundPlayed.current) {
          deathSoundPlayed.current = true;
          playBurnSound();
        }
        drawScene(context, p, camera, coins.current, scoreRef.current, now, splashRipple.current, smokeEffect.current, null, level, false);
        frame = requestAnimationFrame(tick);
        return;
      }
      const touchingElectricSkull = level === 3 && getElectricSkullPositions(now).some((skull) =>
        Math.abs(centerX - skull.x) < 25 && Math.abs(p.y + p.h / 2 - skull.y) < 25,
      );
      if (level === 3 && (p.y + p.h >= ELECTRIC_FLOOR_Y || touchingElectricSkull)) {
        p.y = ELECTRIC_FLOOR_Y - p.h;
        shockEffect.current = { x: centerX, y: p.y + p.h / 2, startAt: now };
        if (!deathSoundPlayed.current) {
          deathSoundPlayed.current = true;
          playElectricShock();
        }
        drawScene(context, p, camera, coins.current, scoreRef.current, now, splashRipple.current, null, shockEffect.current, level, level === 3 && flightMode.current);
        frame = requestAnimationFrame(tick);
        return;
      }
      drawScene(context, p, camera, coins.current, scoreRef.current, now, splashRipple.current, smokeEffect.current, null, level, level === 3 && flightMode.current);
      if (p.y > HEIGHT + 20) {
        if (splashRipple.current && now - splashRipple.current.startAt < 1050) {
          frame = requestAnimationFrame(tick);
          return;
        }
        finish("lost");
        return;
      }
      if (p.x > 3390) { playWinSound(); finish("won"); return; }
      if (!finished.current) frame = requestAnimationFrame(tick);
    }

    function finish(result: "won" | "lost" | "timeout") {
      finished.current = true;
      setStatus(result);
      if (scoreRef.current > best) {
        setBest(scoreRef.current);
        try { localStorage.setItem("mesai-runner-best", String(scoreRef.current)); } catch { /* local storage may be disabled */ }
      }
      if (result === "lost") {
        scoreRef.current = 0;
        setScore(0);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status, best, level]);

  function start() {
    prepareAudio();
    player.current = { x: 54, y: FLOOR - 38, vx: 0, vy: 0, w: 30, h: 38, grounded: true };
    setLevel(1);
    coins.current = COINS.map((coin) => ({ ...coin }));
    splashRipple.current = null;
    smokeEffect.current = null;
    shockEffect.current = null;
    movingSupport.current = null;
    lastPlatformIndex.current = null;
    swingUsedFromPlatform.current = null;
    flightMode.current = false;
    deathSoundPlayed.current = false;
    scoreRef.current = 0;
    keys.current.clear();
    finished.current = false;
    jumpWasDown.current = false;
    deadline.current = performance.now() + ROUND_SECONDS * 1000;
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setStatus("playing");
  }

  function startLevelTwo() {
    prepareAudio();
    player.current = { x: 54, y: FLOOR - 38, vx: 0, vy: 0, w: 30, h: 38, grounded: true };
    setLevel(2);
    coins.current = LEVEL_TWO_COINS.map((coin) => ({ ...coin }));
    splashRipple.current = null;
    smokeEffect.current = null;
    shockEffect.current = null;
    movingSupport.current = null;
    lastPlatformIndex.current = null;
    swingUsedFromPlatform.current = null;
    flightMode.current = false;
    deathSoundPlayed.current = false;
    keys.current.clear();
    finished.current = false;
    jumpWasDown.current = false;
    deadline.current = performance.now() + LEVEL_TWO_SECONDS * 1000;
    setTimeLeft(LEVEL_TWO_SECONDS);
    setStatus("playing");
  }

  function startLevelThree() {
    prepareAudio();
    player.current = { x: 54, y: FLOOR - 38, vx: 0, vy: 0, w: 30, h: 38, grounded: true };
    setLevel(3);
    coins.current = LEVEL_THREE_COINS.map((coin) => ({ ...coin }));
    splashRipple.current = null;
    smokeEffect.current = null;
    shockEffect.current = null;
    movingSupport.current = null;
    lastPlatformIndex.current = null;
    swingUsedFromPlatform.current = null;
    flightMode.current = false;
    deathSoundPlayed.current = false;
    keys.current.clear();
    finished.current = false;
    jumpWasDown.current = false;
    deadline.current = performance.now() + LEVEL_THREE_SECONDS * 1000;
    setTimeLeft(LEVEL_THREE_SECONDS);
    setStatus("playing");
  }

  function hold(code: string, down: boolean) {
    if (down) keys.current.add(code);
    else keys.current.delete(code);
  }

  async function toggleFullscreen() {
    if (manualFullscreen) {
      setManualFullscreen(false);
      return;
    }
    if (document.fullscreenElement === gameRef.current) {
      await document.exitFullscreen();
      return;
    }
    const game = gameRef.current;
    if (game?.requestFullscreen) {
      try {
        await game.requestFullscreen();
        return;
      } catch { /* Fall back to an in-page full-screen layout on mobile browsers. */ }
    }
    setManualFullscreen(true);
  }

  const primaryAction = status === "won" && level === 1 ? startLevelTwo : status === "won" && level === 2 ? startLevelThree : level === 2 ? startLevelTwo : level === 3 ? startLevelThree : start;
  const startTap = useMobileTap(primaryAction);
  const fullscreenTap = useMobileTap(toggleFullscreen);
  function moveJoystick(event: React.PointerEvent<HTMLDivElement>) {
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.31;
    const flying = level === 3 && flightMode.current;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = flying ? event.clientY - (rect.top + rect.height / 2) : 0;
    if (flying) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) { dx = dx / distance * radius; dy = dy / distance * radius; }
    } else {
      dx = Math.max(-radius, Math.min(radius, dx));
    }
    const knob = element.querySelector<HTMLElement>(".platform-joystick-knob");
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
    for (const code of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) keys.current.delete(code);
    if (Math.abs(dx) > radius * 0.22) hold(dx < 0 ? "ArrowLeft" : "ArrowRight", true);
    if (flying && Math.abs(dy) > radius * 0.22) hold(dy < 0 ? "ArrowUp" : "ArrowDown", true);
  }
  function endJoystick(event: React.PointerEvent<HTMLDivElement>) {
    for (const code of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) keys.current.delete(code);
    if (joystickRef.current) {
      const knob = joystickRef.current.querySelector<HTMLElement>(".platform-joystick-knob");
      if (knob) knob.style.transform = "translate(0, 0)";
      if (joystickRef.current.hasPointerCapture(event.pointerId)) joystickRef.current.releasePointerCapture(event.pointerId);
    }
  }
  return (
    <div ref={gameRef} className={`platform-game${manualFullscreen ? " platform-game--fullscreen" : ""}`}>
      <div className="platform-toolbar">
        <button type="button" className="platform-fullscreen-toggle" aria-pressed={isFullscreen || manualFullscreen} {...fullscreenTap}>
          {isFullscreen || manualFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
        </button>
      </div>
      <div className="platform-stage">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Super Hayro platform oyunu" />
        {status !== "playing" && (
          <div className="platform-overlay">
            <span className="eyebrow">ÇEVRİMDIŞI PLATFORM OYUNU · BÖLÜM {level}</span>
            <h2 className={status === "won" ? "platform-result platform-win" : status === "lost" || status === "timeout" ? "platform-result" : undefined}>{status === "ready" ? "Super Hayro" : status === "won" ? "TEBRİKLER KAZANDINIZ..!" : status === "lost" || status === "timeout" ? "KAYBETTİNİZ..!" : "Bir sonraki sıçrayışta başarırsın!"}</h2>
            <p>{status === "ready" ? "Altınları topla, çukurları aş ve bayrağa ulaş." : status === "won" && level === 1 ? `Toplanan altın: ${score} · İkinci seviye açıldı!` : `Toplanan altın: ${score} · Rekor: ${best}`}</p>
            <button type="button" className="cta" {...startTap}>{status === "ready" ? "Oyuna başla" : status === "won" && level === 1 ? "2. seviyeye geç" : status === "won" && level === 2 ? "3. seviyeye geç" : level === 2 ? "2. seviyeyi yeniden oyna" : level === 3 ? "3. seviyeyi yeniden oyna" : "Yeniden oyna"}</button>
            {level === 2 && <button className="platform-back-level" onClick={start}>1. seviyeye dön</button>}
            {level === 3 && <button className="platform-back-level" onClick={startLevelTwo}>2. seviyeye dön</button>}
          </div>
        )}
      </div>
      <div className="platform-hud"><span>Bölüm: <b>{level}</b></span><span>Süre: <b>{timeLeft} sn</b></span><span>Altın: <b>{score}</b></span><span>Rekor: <b>{best}</b></span>{level !== 3 && <span>Hareket: ← → · Zıpla: Boşluk</span>}</div>
      <div className="platform-controls" aria-label="Dokunmatik oyun kontrolleri">
        <div ref={joystickRef} className="platform-joystick" role="group" aria-label="Sağa ve sola ilerleme yönlendiricisi"
          onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); moveJoystick(event); }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveJoystick(event); }}
          onPointerUp={endJoystick} onPointerCancel={endJoystick} onLostPointerCapture={endJoystick}>
          <span className="platform-joystick-knob" aria-hidden="true" />
        </div>
        <div className="platform-control-actions">
          <button type="button" className="platform-jump-button" aria-label="Zıpla"
            onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); hold("Space", true); }}
            onPointerUp={(event) => { hold("Space", false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
            onPointerCancel={() => hold("Space", false)} onLostPointerCapture={() => hold("Space", false)}>Zıpla</button>
        </div>
      </div>
    </div>
  );
}
