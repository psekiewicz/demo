// Opens every page of the demo in Chromium, signed in and signed out, and
// fails on an uncaught exception, a console error or a file of ours that does
// not load. Then clicks through a few writes (like, comment, follow, buy) and
// checks they survive a reload.
//
//   node tools/check.mjs            (CHROMIUM=/path/to/chrome to pick a browser)
//
// The repo is served under /demo/, the way GitHub Pages serves it.
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright from wherever it is installed (npm i -D playwright, or globally).
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/demo/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function resolve(urlPath) {
  if (!urlPath.startsWith(BASE)) return null;
  const clean = decodeURIComponent(urlPath.slice(BASE.length - 1));
  for (const c of [clean, path.join(clean, 'index.html'), `${clean}.html`]) {
    const file = path.join(root, c);
    if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

const server = createServer((req, res) => {
  const file = resolve(new URL(req.url, 'http://x').pathname);
  if (!file) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(readFileSync(path.join(root, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const problems = [];

async function open(context, url, label) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`exception: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('response', (r) => r.url().startsWith(origin) && r.status() >= 400 && !r.url().includes('/fake/uploads/') && errors.push(`${r.status()}: ${r.url()}`));
  await page.goto(origin + url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  // The browser's own "failed to load" line repeats a response caught above;
  // an aborted view transition is a page redirecting before it finished
  // drawing (login when already signed in), not an error of the page.
  const real = errors.filter((e) => !/Failed to load resource|Transition was aborted/.test(e));
  if (real.length) problems.push(`${label} ${url}\n  ${real.join('\n  ')}`);
  return page;
}

// Stub everything off this machine: the check must not depend on the network.
async function newContext() {
  const context = await browser.newContext();
  await context.route((u) => !u.href.startsWith(origin), (route) => route.fulfill({ status: 204, body: '' }));
  return context;
}

const pages = readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
const signedIn = await newContext();
const home = await open(signedIn, BASE, 'signed in');
const firstDemo = await home.evaluate(() => document.querySelector('.demo-card')?.dataset.id);
const author = await home.evaluate(() => new URL(document.querySelector('.scroll-author').href).searchParams.get('user'));
const article = await home.evaluate(async () => {
  const { supabase } = await import('/demo/js/supabase-init.js');
  const { data } = await supabase.from('news_articles').select('id').limit(1);
  return data[0].id;
});
const letter = await home.evaluate(async () => {
  const { supabase } = await import('/demo/js/supabase-init.js');
  const { data } = await supabase.from('newsletters').select('id').eq('published', true).limit(1);
  return data[0].id;
});
const withQuery = { project: `?id=${firstDemo}`, profile: `?user=${author}`, article: `?id=${article}`, newsletter: `?id=${letter}`, consent: `?token=${'a'.repeat(64)}` };
for (const name of pages) {
  const p = await open(signedIn, `${BASE}${name === 'index' ? '' : name}${withQuery[name] || ''}`, 'signed in');
  await p.close();
}
for (const doc of ['privacy', 'terms', 'guidelines']) await (await open(signedIn, `${BASE}legal/${doc}`, 'signed in')).close();

// Writes, then a reload: still there?
const project = await open(signedIn, `${BASE}project?id=${firstDemo}`, 'write');
const before = await project.evaluate(async (id) => {
  const { supabase } = await import('/demo/js/supabase-init.js');
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('likes').delete().eq('project_id', id).eq('user_id', user.id);
  const { data } = await supabase.from('projects').select('likes_count').eq('id', id).single();
  const like = await supabase.from('likes').insert({ project_id: id, user_id: user.id });
  const comment = await supabase.from('comments').insert({ project_id: id, user_id: user.id, author_name: 'Demo', body: 'check.mjs was here' });
  const buy = await supabase.rpc('purchase_item', { p_item_id: 'name-gold' });
  return { likes: data.likes_count, errors: [like.error, comment.error, buy.error].filter(Boolean).map((e) => e.message) };
}, firstDemo);
if (before.errors.length) problems.push(`writes failed: ${before.errors.join(', ')}`);
await project.reload();
await project.waitForTimeout(500);
const after = await project.evaluate(async (id) => {
  const { supabase } = await import('/demo/js/supabase-init.js');
  const { data } = await supabase.from('projects').select('likes_count').eq('id', id).single();
  const { data: c } = await supabase.from('comments').select('body').eq('project_id', id);
  const { data: owned } = await supabase.from('owned_items').select('item_id').eq('item_id', 'name-gold');
  return { likes: data.likes_count, comment: c.some((x) => x.body === 'check.mjs was here'), bought: owned.length > 0 };
}, firstDemo);
if (after.likes !== before.likes + 1 || !after.comment || !after.bought) problems.push(`writes did not persist: ${JSON.stringify({ before, after })}`);
const shown = await project.locator('text=check.mjs was here').count();
if (!shown) problems.push('the new comment is not on the page');

// Signed out.
const signedOut = await newContext();
await signedOut.addInitScript(() => {
  try {
    localStorage.setItem('xoxd-demo-epoch', String(Date.now()));
  } catch {}
});
for (const name of ['index', 'project', 'profile', 'news', 'leaderboard', 'shop', 'login', 'register']) {
  const p = await open(signedOut, `${BASE}${name === 'index' ? '' : name}${withQuery[name] || ''}`, 'signed out');
  await p.close();
}

// Signing up makes an account and lands on a page that works.
const reg = await open(signedOut, `${BASE}register`, 'sign up');
const counts = await reg.evaluate(async () => {
  const { stats } = await import('/demo/fake/backend.js');
  return stats();
});
console.log('Database:', Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', '));

await browser.close();
server.close();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n\n${problems.join('\n\n')}`);
  process.exit(1);
}
console.log(`OK: ${pages.length} pages signed in, 8 signed out, writes persist.`);
