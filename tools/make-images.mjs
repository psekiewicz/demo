// Draws the demo's pictures: fake/img/cover-0..71.svg (demo covers, portrait
// so the full-screen feed crops them well). Profile photos come from
// randomuser.me; fake/img/protogen.webp is the Demo account's avatar.
// Deterministic, so running it again changes nothing.
//
//   node tools/make-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fake/img');
mkdirSync(out, { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hsl = (h, s, l) => `hsl(${Math.round(h) % 360} ${s}% ${l}%)`;

function cover(i) {
  const r = rng(1000 + i);
  const W = 720;
  const H = 960;
  const h = r() * 360;
  const h2 = h + 40 + r() * 140;
  const style = i % 6;
  let body = '';
  if (style === 0) {
    for (let k = 0; k < 14; k++) body += `<circle cx="${r() * W}" cy="${r() * H}" r="${30 + r() * 220}" fill="${hsl(h + r() * 90, 80, 60 + r() * 20)}" opacity="${0.25 + r() * 0.5}"/>`;
  } else if (style === 1) {
    for (let k = 0; k < 18; k++) {
      const y = (k / 18) * H;
      body += `<path d="M0 ${y} C ${W * 0.3} ${y - 80 - r() * 80}, ${W * 0.7} ${y + 80 + r() * 80}, ${W} ${y}" stroke="${hsl(h2 + k * 6, 85, 70)}" stroke-width="${4 + r() * 14}" fill="none" opacity="0.8"/>`;
    }
  } else if (style === 2) {
    const n = 8;
    for (let x = 0; x < n; x++) for (let y = 0; y < Math.ceil((n * H) / W); y++) {
      if (r() < 0.55) body += `<rect x="${(x * W) / n + 6}" y="${(y * W) / n + 6}" width="${W / n - 12}" height="${W / n - 12}" rx="${r() * 40}" fill="${hsl(h + r() * 60, 75, 55 + r() * 25)}"/>`;
    }
  } else if (style === 3) {
    for (let k = 0; k < 9; k++) body += `<circle cx="${W / 2}" cy="${H / 2}" r="${60 + k * 48}" stroke="${hsl(h2 + k * 12, 90, 65)}" stroke-width="${10 + r() * 16}" fill="none" stroke-dasharray="${20 + r() * 80} ${10 + r() * 40}" transform="rotate(${r() * 360} ${W / 2} ${H / 2})"/>`;
  } else if (style === 4) {
    for (let k = 0; k < 40; k++) {
      const x = r() * W;
      const y = r() * H;
      const s = 20 + r() * 90;
      body += `<polygon points="${x},${y - s} ${x + s},${y + s} ${x - s},${y + s}" fill="${hsl(h + r() * 120, 80, 60)}" opacity="${0.3 + r() * 0.6}" transform="rotate(${r() * 360} ${x} ${y})"/>`;
    }
  } else {
    let d = `M0 ${H}`;
    for (let x = 0; x <= W; x += 24) d += ` L${x} ${H * 0.55 + Math.sin(x / 60 + r()) * 60 - r() * 120}`;
    d += ` L${W} ${H} Z`;
    body += `<circle cx="${W * (0.25 + r() * 0.5)}" cy="${H * 0.3}" r="${80 + r() * 60}" fill="${hsl(h2, 95, 75)}"/>`;
    body += `<path d="${d}" fill="${hsl(h, 50, 22)}"/>`;
    for (let k = 0; k < 60; k++) body += `<circle cx="${r() * W}" cy="${r() * H * 0.5}" r="${1 + r() * 2.5}" fill="#fff" opacity="${r()}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h, 70, style === 5 ? 35 : 22)}"/><stop offset="1" stop-color="${hsl(h2, 70, style === 5 ? 55 : 38)}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>${body}</svg>\n`;
}

for (let i = 0; i < 72; i++) writeFileSync(path.join(out, `cover-${i}.svg`), cover(i));
console.log('Wrote 72 covers to fake/img');
