// Shared by every toy: the title from ?title=, and a colour from ?seed= so
// two demos built on the same toy don't look identical.
const params = new URLSearchParams(location.search);
export const seed = Number(params.get('seed')) || 1;
export const title = params.get('title') || document.title;
document.title = title;
document.documentElement.style.setProperty('--hue', String((seed * 47) % 360));
const h1 = document.querySelector('h1');
if (h1) h1.textContent = title;

export function rng(s = seed) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hue = (seed * 47) % 360;

// Keeps a canvas sharp on high-density screens at a given CSS size.
export function fitCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
