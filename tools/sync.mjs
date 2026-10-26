// Copies the XOXD site into this repo and turns it into the demo:
//
//   node tools/sync.mjs ../psekiewicz.github.io
//
// - every root-absolute path ("/js/nav.js", "/project?id=") gets the base
//   this repo is served under (GitHub Pages: /demo/);
// - js/supabase-init.js imports fake/backend.js instead of supabase-js, so
//   every page runs against the in-browser database;
// - sw.js is replaced with fake/sw.js (it serves demo uploads);
// - every page loads fake/banner.js, the demo menu.
//
// Only the files listed below are written; fake/, tools/ and the README are
// this repo's own and never touched.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || '../psekiewicz.github.io');
const BASE = process.env.DEMO_BASE || '/demo/';

if (!existsSync(path.join(source, 'js/supabase-init.js'))) {
  console.error(`Not an XOXD checkout: ${source}`);
  process.exit(1);
}

const DIRS = ['css', 'js', 'assets', 'fonts', 'icons', 'legal', 'download'];
const SKIP_HTML = new Set(['issue.html']);
const pages = readdirSync(source).filter((f) => f.endsWith('.html') && !SKIP_HTML.has(f));
const extra = ['manifest.webmanifest'];

// Top-level names a root-absolute path can start with.
const TOP = [...DIRS, ...pages.map((f) => f.replace(/\.html$/, '')), ...pages, ...extra, 'sw.js']
  .sort((a, b) => b.length - a.length)
  .map((s) => s.replace(/[.]/g, '\\.'));
const TOP_PATH = new RegExp(`(["'\`(])/(?=(?:${TOP.join('|')})(?=[/?#.'"\`)]|$))`, 'g');

function rebase(text) {
  return (
    text
      .replace(TOP_PATH, `$1${BASE}`)
      // The home page, in the forms the site writes it.
      .replace(/(href|content|src)="\/"/g, `$1="${BASE}"`)
      .replace(/(["'`])\/(?=[#?])/g, `$1${BASE}`)
      .replace(/(= |\|\| |\(|: |\? )'\/'/g, `$1'${BASE}'`)
      .replace(/"(start_url|scope)": "\/(index\.html)?"/g, (_, key, file) => `"${key}": "${BASE}${file || ''}"`)
  );
}

const BANNER = `<script type="module" src="${BASE}fake/banner.js"></script>`;

function transform(rel, text) {
  let out = rebase(text);
  if (rel === 'js/supabase-init.js') {
    out = `// Demo build: the whole backend is fake/backend.js, a database in this
// browser. Written by tools/sync.mjs - edit the source site, not this.
import { createClient } from '../fake/backend.js';

export const supabase = createClient();
`;
  }
  if (rel === 'js/utils.js') {
    // pageId("/demo/") has to be the home page, not a page called "demo".
    out = out.replace(
      "const clean = String(pathOrHref || '').split(/[?#]/)[0];",
      `const clean = String(pathOrHref || '').split(/[?#]/)[0].replace(/^${BASE.replace(/\/$/, '').replace(/\//g, '\\/')}(?=\\/|$)/, '') || '/';`,
    );
  }
  if (rel.endsWith('.html')) {
    out = out
      .replace('</body>', `  ${BANNER}\n</body>`)
      .replace(/<meta name="robots"[^>]*>\s*/g, '')
      .replace('<head>', '<head>\n  <meta name="robots" content="noindex" />');
  }
  return out;
}

const TEXT = /\.(html|js|mjs|css|webmanifest|json|svg|txt|xml)$/;

function copy(rel) {
  const from = path.join(source, rel);
  const to = path.join(here, rel);
  if (statSync(from).isDirectory()) {
    readdirSync(from).forEach((child) => copy(path.join(rel, child)));
    return;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  if (TEXT.test(rel) && !rel.startsWith('assets/')) {
    writeFileSync(to, transform(rel, readFileSync(from, 'utf8')));
  } else {
    cpSync(from, to);
  }
}

DIRS.forEach((dir) => rmSync(path.join(here, dir), { recursive: true, force: true }));
[...DIRS, ...pages, ...extra].forEach(copy);
cpSync(path.join(here, 'fake/sw.js'), path.join(here, 'sw.js'));
writeFileSync(path.join(here, '.nojekyll'), '');

const sha = (() => {
  try {
    const head = readFileSync(path.join(source, '.git/HEAD'), 'utf8').trim();
    const ref = head.startsWith('ref: ') ? readFileSync(path.join(source, '.git', head.slice(5)), 'utf8').trim() : head;
    return ref.slice(0, 7);
  } catch {
    return 'unknown';
  }
})();
writeFileSync(path.join(here, 'fake/source.json'), JSON.stringify({ source: 'psekiewicz/psekiewicz.github.io', commit: sha }, null, 2) + '\n');
console.log(`Synced ${pages.length} pages from ${source} (${sha}) with base ${BASE}`);
