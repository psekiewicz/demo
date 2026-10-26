// A stand-in for @supabase/supabase-js that keeps the whole XOXD database in
// this browser tab. js/supabase-init.js imports createClient() from here, so
// every page of the site runs unchanged against it.
//
// - The data is fake/seed.js: generated, the same every time for the same
//   start date.
// - What you change (likes, posts, purchases...) is kept as a short journal
//   in localStorage and replayed on top of the generated data on every load.
//   localStorage, because it is synchronous: a page that writes and then
//   navigates straight away must not lose the write.
// - The rules that matter in the real schema - who may see or change a row,
//   counters and points a client cannot set, notifications, prices - are
//   approximated here so the site behaves as it does for real.
import { generate, ACCOUNTS, ACHIEVEMENT_REWARDS } from './seed.js';
import { SHOP_ITEMS, SHOP_BUNDLES, bundlePriceFor } from '../js/shop-items.js';

export const BASE = new URL('..', import.meta.url).pathname;
const KEY = { epoch: 'xoxd-demo-epoch', journal: 'xoxd-demo-journal', session: 'xoxd-demo-session' };
const UPLOADS = 'xoxd-demo-uploads';

const ls = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch { /* nothing to do */ }
  },
};

// ------------------------------------------------------------- the data

// Primary keys, so a journal entry can find its row again.
const PK = {
  likes: ['project_id', 'user_id'],
  follows: ['follower_id', 'following_id'],
  saves: ['user_id', 'project_id'],
  news_likes: ['article_id', 'user_id'],
  news_reads: ['user_id', 'article_id'],
  owned_items: ['user_id', 'item_id'],
  unlocked_achievements: ['user_id', 'achievement_id'],
  account_ages: ['user_id'],
  news_editors: ['user_id'],
  newsletter_editors: ['newsletter_id', 'user_id'],
  reports: ['project_id', 'reporter_id'],
};
const keyOf = (table, row) => (PK[table] || ['id']).map((c) => row[c]).join('|');

let epoch = Number(ls.get(KEY.epoch));
const firstVisit = !epoch;
if (firstVisit) {
  epoch = Date.now();
  ls.set(KEY.epoch, String(epoch));
}
const db = generate({ base: BASE, now: epoch });
db.project_views.forEach((v, i) => (v.id = `v${i}`));
// The user_reputation view, worked out again only after a write.
let repDirty = true;
let repCache = [];

function replay(entries) {
  const index = new Map();
  const mapFor = (table) => {
    if (!index.has(table)) index.set(table, new Map((db[table] || []).map((r) => [keyOf(table, r), r])));
    return index.get(table);
  };
  for (const [op, table, key, row] of entries) {
    if (!db[table]) db[table] = [];
    const map = mapFor(table);
    const existing = map.get(key);
    if (op === 'put') {
      if (existing) Object.assign(existing, row);
      else {
        const fresh = { ...row };
        db[table].push(fresh);
        map.set(key, fresh);
      }
    } else if (existing) {
      db[table].splice(db[table].indexOf(existing), 1);
      map.delete(key);
    }
  }
}

let pending = [];
let flushQueued = false;
function record(op, table, row) {
  pending.push([op, table, keyOf(table, row), op === 'put' ? { ...row } : null]);
  repDirty = true;
  if (!flushQueued) {
    flushQueued = true;
    queueMicrotask(flush);
  }
}
function flush() {
  flushQueued = false;
  if (!pending.length) return;
  journal.push(...pending);
  pending = [];
  ls.set(KEY.journal, JSON.stringify(journal));
}
addEventListener('pagehide', flush);

const rows = (table) => (db[table] ||= []);
function insertRow(table, row) {
  rows(table).push(row);
  record('put', table, row);
  return row;
}
function patchRow(table, row, patch) {
  Object.assign(row, patch);
  record('put', table, row);
  return row;
}
function removeRow(table, row) {
  const list = rows(table);
  const i = list.indexOf(row);
  if (i >= 0) list.splice(i, 1);
  record('del', table, row);
}

const nowIso = () => new Date().toISOString();
const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));

// ------------------------------------------------------------ who is here

function sessionUserId() {
  const id = ls.get(KEY.session);
  return id && rows('auth_users').some((u) => u.id === id) ? id : null;
}
function authUser(id = sessionUserId()) {
  const u = rows('auth_users').find((x) => x.id === id);
  if (!u) return null;
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    user_metadata: { display_name: u.display_name },
    app_metadata: { provider: 'email' },
    created_at: u.created_at,
  };
}
const me = () => sessionUserId();
const profileOf = (id) => rows('profiles').find((p) => p.id === id);
const isAdmin = () => Boolean(profileOf(me())?.is_admin);
const isNewsroom = () => rows('news_editors').some((e) => e.user_id === me());

function canWriteNewsletter(id) {
  const uid = me();
  if (!uid) return false;
  return (
    isNewsroom() ||
    rows('newsletters').some((n) => n.id === id && n.created_by === uid) ||
    rows('newsletter_editors').some((e) => e.newsletter_id === id && e.user_id === uid)
  );
}

// ------------------------------------------------------ row level security

const OWN_ROWS = ['notifications', 'saves', 'account_ages', 'news_reads'];

function canSee(table, row) {
  const uid = me();
  if (isAdmin() && table !== 'notifications') return true;
  if (table === 'projects') return row.published || row.user_id === uid;
  if (OWN_ROWS.includes(table)) return row.user_id === uid;
  if (table === 'newsletters') return row.published || canWriteNewsletter(row.id);
  if (table === 'news_articles') {
    const letter = rows('newsletters').find((n) => n.id === row.newsletter_id);
    return Boolean(letter && (letter.published || canWriteNewsletter(letter.id)));
  }
  if (table === 'reports' || table === 'auth_users') return false;
  if (table === 'announcements') return row.active;
  return true;
}

// Who a row belongs to, for writes. Tables missing here are written only by
// the functions below (or by an admin).
const OWNER = {
  projects: 'user_id', comments: 'user_id', likes: 'user_id', follows: 'follower_id', saves: 'user_id',
  project_updates: 'user_id', news_comments: 'user_id', news_likes: 'user_id', news_reads: 'user_id',
  reports: 'reporter_id', profiles: 'id', notifications: 'user_id',
};

function canWrite(table, row, op) {
  const uid = me();
  if (!uid) return false;
  if (isAdmin()) return true;
  if (table === 'newsletters') return op === 'insert' ? isNewsroom() : canWriteNewsletter(row.id);
  if (table === 'news_articles') return canWriteNewsletter(row.newsletter_id);
  if (table === 'newsletter_editors') return rows('newsletters').some((n) => n.id === row.newsletter_id && n.created_by === uid);
  if (table === 'comments' && op === 'delete') {
    return row.user_id === uid || rows('projects').some((p) => p.id === row.project_id && p.user_id === uid);
  }
  if (table === 'reports' && op !== 'insert') return false;
  const col = OWNER[table];
  return Boolean(col && row[col] === uid);
}

const RLS_ERROR = { message: 'new row violates row-level security policy', code: '42501' };
const DUPLICATE = { message: 'duplicate key value violates unique constraint', code: '23505' };

// ---------------------------------------------------- defaults and triggers

const DEFAULTS = {
  projects: () => ({
    title: '', summary: '', description: '', image_url: '', tags: [], repo_url: '', live_url: '', project_type: 'other',
    views_count: 0, likes_count: 0, comments_count: 0, media_url: '', scroll_image_url: '', scroll_bg: '', published: false,
    updated_at: nowIso(),
  }),
  newsletters: () => ({ summary: '', cover_url: '', published: true, updated_at: nowIso() }),
  news_articles: () => ({ lead: '', body: '', image_url: '', source_name: '', source_url: '', likes_count: 0, comments_count: 0, updated_at: nowIso() }),
  reports: () => ({ note: '', status: 'open' }),
  announcements: () => ({ attachments: [], active: true, expires_at: null }),
  project_updates: () => ({ version: '' }),
};

function notify(userId, actorId, type, projectId) {
  if (!userId || userId === actorId) return;
  const id = rows('notifications').reduce((m, n) => Math.max(m, n.id), 0) + 1;
  insertRow('notifications', { id, user_id: userId, actor_id: actorId, type, project_id: projectId, created_at: nowIso(), read_at: null });
}
const followersOf = (uid) => rows('follows').filter((f) => f.following_id === uid).map((f) => f.follower_id);
const projectOf = (id) => rows('projects').find((p) => p.id === id);
const bump = (table, row, col, by) => row && patchRow(table, row, { [col]: Math.max(0, (row[col] || 0) + by) });

function afterInsert(table, row) {
  const uid = me();
  if (table === 'likes') {
    const p = projectOf(row.project_id);
    bump('projects', p, 'likes_count', 1);
    notify(p?.user_id, uid, 'like', row.project_id);
  } else if (table === 'comments') {
    const p = projectOf(row.project_id);
    bump('projects', p, 'comments_count', 1);
    notify(p?.user_id, uid, 'comment', row.project_id);
  } else if (table === 'follows') {
    notify(row.following_id, uid, 'follow', null);
  } else if (table === 'projects' && row.published) {
    followersOf(row.user_id).forEach((f) => notify(f, row.user_id, 'post', row.id));
  } else if (table === 'project_updates') {
    const p = projectOf(row.project_id);
    if (p) patchRow('projects', p, { updated_at: row.created_at });
    followersOf(row.user_id).forEach((f) => notify(f, row.user_id, 'update', row.project_id));
  } else if (table === 'news_likes') {
    bump('news_articles', rows('news_articles').find((a) => a.id === row.article_id), 'likes_count', 1);
  } else if (table === 'news_comments') {
    bump('news_articles', rows('news_articles').find((a) => a.id === row.article_id), 'comments_count', 1);
  }
}

function afterDelete(table, row) {
  if (table === 'likes') bump('projects', projectOf(row.project_id), 'likes_count', -1);
  else if (table === 'comments') bump('projects', projectOf(row.project_id), 'comments_count', -1);
  else if (table === 'news_likes') bump('news_articles', rows('news_articles').find((a) => a.id === row.article_id), 'likes_count', -1);
  else if (table === 'news_comments') bump('news_articles', rows('news_articles').find((a) => a.id === row.article_id), 'comments_count', -1);
  else if (table === 'projects') {
    for (const t of ['likes', 'comments', 'project_updates', 'saves', 'notifications', 'reports', 'project_views']) {
      rows(t).filter((r) => r.project_id === row.id).forEach((r) => removeRow(t, r));
    }
  } else if (table === 'newsletters') {
    rows('news_articles').filter((a) => a.newsletter_id === row.id).forEach((a) => removeRow('news_articles', a));
  }
}

// Columns a client may not set: the guard triggers in schema.sql.
function guardPatch(table, row, patch) {
  const out = { ...patch };
  if (table === 'profiles') {
    delete out.points;
    delete out.points_earned_total;
    delete out.is_admin;
    delete out.id;
    const owns = (item) => item === 'none' || rows('owned_items').some((o) => o.user_id === row.id && o.item_id === item);
    for (const col of ['equipped_bg', 'equipped_border', 'equipped_name_effect']) {
      if (col in out && !owns(out[col])) delete out[col];
    }
  }
  if (table === 'projects') {
    ['views_count', 'likes_count', 'comments_count', 'user_id', 'id', 'created_at'].forEach((c) => delete out[c]);
    out.updated_at = nowIso();
  }
  if (table === 'news_articles') ['likes_count', 'comments_count', 'id'].forEach((c) => delete out[c]);
  return out;
}

// ------------------------------------------------------- the reputation view

function reputation() {
  if (!repDirty) return repCache;
  const published = new Map();
  for (const p of rows('projects')) {
    if (!p.published) continue;
    if (!published.has(p.user_id)) published.set(p.user_id, []);
    published.get(p.user_id).push(p);
  }
  const ownerOf = new Map(rows('projects').filter((p) => p.published).map((p) => [p.id, p.user_id]));
  const likes = new Map();
  rows('likes').forEach((l) => { const o = ownerOf.get(l.project_id); if (o) likes.set(o, (likes.get(o) || 0) + 1); });
  const comments = new Map();
  rows('comments').forEach((c) => { const o = ownerOf.get(c.project_id); if (o && o !== c.user_id) comments.set(o, (comments.get(o) || 0) + 1); });
  const releases = new Map();
  const releaseDays = new Set();
  rows('project_updates').forEach((u) => {
    const o = ownerOf.get(u.project_id);
    const k = `${u.project_id}|${String(u.created_at).slice(0, 10)}`;
    if (o && !releaseDays.has(k)) { releaseDays.add(k); releases.set(o, (releases.get(o) || 0) + 1); }
  });
  const viewers = new Map();
  rows('project_views').forEach((v) => {
    const o = ownerOf.get(v.project_id);
    if (!o || !v.viewer_id) return;
    if (!viewers.has(o)) viewers.set(o, new Set());
    viewers.get(o).add(v.viewer_id);
  });
  const followers = new Map();
  rows('follows').forEach((f) => followers.set(f.following_id, (followers.get(f.following_id) || 0) + 1));

  repCache = rows('profiles').map((profile) => {
    const id = profile.id;
    const mine = published.get(id) || [];
    const t = {
      published_projects: mine.length,
      total_views: mine.reduce((s, p) => s + (p.views_count || 0), 0),
      demo_projects: mine.filter((p) => p.live_url || p.media_url).length,
      likes_received: likes.get(id) || 0,
      comments_received: comments.get(id) || 0,
      releases: releases.get(id) || 0,
    };
    const uv = viewers.get(id)?.size || 0;
    const fl = followers.get(id) || 0;
    return {
      user_id: id,
      ...t,
      unique_viewers: uv,
      followers: fl,
      xp: Math.min(t.published_projects, 20) * 25 + Math.min(t.releases, 20) * 10 + uv * 2 + t.likes_received * 30 + t.comments_received * 15 + fl * 60,
      lifetime_points: uv + t.likes_received * 5 + t.comments_received * 3 + fl * 10,
    };
  });
  repDirty = false;
  return repCache;
}

function latestUpdates() {
  const seen = new Map();
  [...rows('project_updates')]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .forEach((u) => seen.has(u.project_id) || seen.set(u.project_id, u));
  return [...seen.values()];
}

const VIEWS = { user_reputation: reputation, project_latest_updates: latestUpdates };

// ------------------------------------------------------------ start up

// Everyone has been collecting their earnings all along: what is left to
// collect is a little, not everything they ever earned.
const generatedProfiles = new Map(db.profiles.map((p) => [p.id, p]));
for (const rep of reputation()) {
  const profile = generatedProfiles.get(rep.user_id);
  profile.points_earned_total = Math.max(0, rep.lifetime_points - 25 - (rep.lifetime_points % 40));
}

let journal = [];
try {
  journal = JSON.parse(ls.get(KEY.journal) || '[]');
} catch {
  journal = [];
}
replay(journal);
repDirty = true;
// A first visit starts signed in, so every screen has something to show, and
// without the cookie notice: the welcome announcement says what matters here.
if (firstVisit) {
  if (!ls.get(KEY.session)) ls.set(KEY.session, ACCOUNTS.demo.id);
  ls.set('cookie-consent', 'demo');
}

// ---------------------------------------------------------------- queries

function likePattern(pattern, flags) {
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, `${flags}s`);
}

const compare = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a > b ? 1 : a < b ? -1 : 0);

// PostgREST's text filters, as .or() and .not() spell them: col.op.value.
function textFilter(col, op, raw) {
  const value = raw === 'null' ? null : raw === 'true' ? true : raw === 'false' ? false : raw;
  switch (op) {
    case 'eq': return (r) => String(r[col]) === String(value);
    case 'neq': return (r) => String(r[col]) !== String(value);
    case 'gt': return (r) => r[col] != null && r[col] > value;
    case 'gte': return (r) => r[col] != null && r[col] >= value;
    case 'lt': return (r) => r[col] != null && r[col] < value;
    case 'lte': return (r) => r[col] != null && r[col] <= value;
    case 'is': return (r) => (value === null ? r[col] == null : r[col] === value);
    case 'ilike': { const re = likePattern(value, 'i'); return (r) => re.test(String(r[col] ?? '')); }
    case 'like': { const re = likePattern(value, ''); return (r) => re.test(String(r[col] ?? '')); }
    case 'in': { const set = new Set(String(value).replace(/^\(|\)$/g, '').split(',')); return (r) => set.has(String(r[col])); }
    default: return () => true;
  }
}

class Query {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.columns = '*';
    this.filters = [];
    this.orders = [];
    this.limitTo = null;
    this.rangeTo = null;
    this.singleMode = null;
    this.head = false;
    this.count = null;
    this.payload = null;
    this.returning = false;
  }

  select(columns = '*', options = {}) {
    if (this.op === 'select') this.columns = columns;
    else this.returning = true;
    if (options.head) this.head = true;
    if (options.count) this.count = options.count;
    return this;
  }
  insert(rowsIn) { this.op = 'insert'; this.payload = rowsIn; return this; }
  upsert(rowsIn) { this.op = 'upsert'; this.payload = rowsIn; return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }

  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  gt(c, v) { this.filters.push((r) => r[c] != null && r[c] > v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] != null && r[c] >= v); return this; }
  lt(c, v) { this.filters.push((r) => r[c] != null && r[c] < v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] != null && r[c] <= v); return this; }
  in(c, values) { const set = new Set(values); this.filters.push((r) => set.has(r[c])); return this; }
  is(c, v) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  ilike(c, p) { const re = likePattern(p, 'i'); this.filters.push((r) => re.test(String(r[c] ?? ''))); return this; }
  like(c, p) { const re = likePattern(p, ''); this.filters.push((r) => re.test(String(r[c] ?? ''))); return this; }
  contains(c, values) { this.filters.push((r) => [].concat(values).every((v) => (r[c] || []).includes(v))); return this; }
  overlaps(c, values) { this.filters.push((r) => [].concat(values).some((v) => (r[c] || []).includes(v))); return this; }
  match(obj) { Object.entries(obj).forEach(([c, v]) => this.eq(c, v)); return this; }
  or(expr) {
    const parts = String(expr).split(/,(?![^(]*\))/).map((part) => {
      const [col, op, ...rest] = part.split('.');
      return textFilter(col, op, rest.join('.'));
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  not(c, op, v) { const f = textFilter(c, op, v === null ? 'null' : String(v)); this.filters.push((r) => !f(r)); return this; }
  filter(c, op, v) { this.filters.push(textFilter(c, op, String(v))); return this; }
  textSearch(c, q) { return this.ilike(c, `%${q}%`); }

  order(c, { ascending = true } = {}) { this.orders.push([c, ascending]); return this; }
  limit(n) { this.limitTo = n; return this; }
  range(from, to) { this.rangeTo = [from, to]; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  single() { this.singleMode = 'one'; return this; }
  abortSignal() { return this; }

  then(resolve, reject) {
    let result;
    try {
      result = this.run();
    } catch (err) {
      result = { data: null, error: { message: err.message || String(err) }, count: null };
    }
    // Answered on a later tick, like a network call, so nothing in the site
    // gets to rely on an answer arriving synchronously.
    return new Promise((r) => setTimeout(() => r(result), 0)).then(resolve, reject);
  }

  source() {
    return VIEWS[this.table] ? VIEWS[this.table]() : rows(this.table);
  }

  matching() {
    return this.source().filter((r) => canSee(this.table, r) && this.filters.every((f) => f(r)));
  }

  run() {
    if (this.op === 'insert' || this.op === 'upsert') return this.write();
    if (this.op === 'update') {
      const hit = this.matching().filter((r) => canWrite(this.table, r, 'update'));
      hit.forEach((r) => patchRow(this.table, r, guardPatch(this.table, r, this.payload)));
      return this.shape(hit.map((r) => ({ ...r })));
    }
    if (this.op === 'delete') {
      const hit = this.matching().filter((r) => canWrite(this.table, r, 'delete'));
      hit.forEach((r) => {
        removeRow(this.table, r);
        afterDelete(this.table, r);
      });
      return this.shape(hit.map((r) => ({ ...r })));
    }
    let out = this.matching();
    for (const [c, asc] of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => compare(a[c], b[c]) * (asc ? 1 : -1));
    }
    const total = out.length;
    if (this.rangeTo) out = out.slice(this.rangeTo[0], this.rangeTo[1] + 1);
    if (this.limitTo != null) out = out.slice(0, this.limitTo);
    if (this.head) return { data: null, count: total, error: null };
    return { ...this.shape(out.map((r) => this.embed(r))), count: this.count ? total : null };
  }

  write() {
    const table = this.table;
    const list = rows(table);
    const written = [];
    for (const input of [].concat(this.payload)) {
      const row = { ...(DEFAULTS[table]?.() || {}), id: uuid(), created_at: nowIso(), ...input };
      if (PK[table]) delete row.id;
      if (!canWrite(table, row, 'insert')) return { data: null, error: RLS_ERROR };
      if (table === 'comments' || table === 'news_comments') {
        row.author_name = row.author_name || profileOf(row.user_id)?.display_name || 'Unknown';
      }
      if (table === 'news_articles') row.author_name = row.author_name || profileOf(row.author_id)?.display_name || 'Unknown';
      const existing = list.find((r) => keyOf(table, r) === keyOf(table, row));
      if (existing) {
        if (this.op === 'insert') return { data: null, error: DUPLICATE };
        patchRow(table, existing, input);
        written.push(existing);
        continue;
      }
      insertRow(table, row);
      afterInsert(table, row);
      written.push(row);
    }
    return this.shape(written.map((r) => ({ ...r })));
  }

  // `select('..., projects (...)')`: the one embed the site uses.
  embed(row) {
    if (!/\bprojects\s*\(/.test(this.columns) || !row.project_id) return { ...row };
    const p = rows('projects').find((x) => x.id === row.project_id && canSee('projects', x));
    return { ...row, projects: p ? { ...p } : null };
  }

  shape(list) {
    if (this.singleMode === 'maybe') return { data: list[0] ?? null, error: null };
    if (this.singleMode === 'one') {
      return list.length ? { data: list[0], error: null } : { data: null, error: { message: 'No rows', code: 'PGRST116' } };
    }
    return { data: list, error: null };
  }
}

// --------------------------------------------------------------- functions

class RpcError extends Error {}
const signedIn = () => {
  const uid = me();
  if (!uid) throw new RpcError('Not signed in');
  return uid;
};
const requireAdmin = () => {
  signedIn();
  if (!isAdmin()) throw new RpcError('Admins only');
};
const itemPrice = (id) => SHOP_ITEMS.find((i) => i.id === id)?.price;

function newsletterTerms() {
  const uid = me();
  const followers = rows('follows').filter((f) => f.following_id === uid).length;
  const owned = rows('newsletters').filter((n) => n.created_by === uid).length;
  const points = profileOf(uid)?.points ?? 0;
  const cost = isNewsroom() || followers >= 25 ? 0 : 500;
  return {
    price: 500, popular_followers: 25, max_owned: 3, followers, owned, points, cost,
    can_start: (isNewsroom() || owned < 3) && points >= cost,
  };
}

const RPC = {
  log_project_view({ p_project_id }) {
    const p = projectOf(p_project_id);
    const uid = me();
    if (!p || p.user_id === uid) return false;
    const recent = Date.now() - 6 * 3_600_000;
    if (uid && rows('project_views').some((v) => v.project_id === p.id && v.viewer_id === uid && Date.parse(v.created_at) > recent)) return false;
    insertRow('project_views', { id: uuid(), project_id: p.id, viewer_id: uid, created_at: nowIso() });
    patchRow('projects', p, { views_count: (p.views_count || 0) + 1 });
    return true;
  },
  my_view_timestamps({ p_days = 14 } = {}) {
    const uid = signedIn();
    const mine = new Set(rows('projects').filter((p) => p.user_id === uid).map((p) => p.id));
    const since = Date.now() - Math.max(1, Math.min(365, p_days)) * 86_400_000;
    return rows('project_views').filter((v) => mine.has(v.project_id) && Date.parse(v.created_at) > since).map((v) => v.created_at);
  },
  collect_earnings() {
    const uid = signedIn();
    const profile = profileOf(uid);
    const lifetime = reputation().find((r) => r.user_id === uid)?.lifetime_points || 0;
    const paid = Math.max(0, lifetime - (profile.points_earned_total || 0));
    if (paid > 0) patchRow('profiles', profile, { points: profile.points + paid, points_earned_total: (profile.points_earned_total || 0) + paid });
    return { paid, points: profile.points };
  },
  record_achievement_unlock({ p_achievement_id }) {
    const uid = signedIn();
    if (!(p_achievement_id in ACHIEVEMENT_REWARDS)) return null;
    if (!rows('unlocked_achievements').some((u) => u.user_id === uid && u.achievement_id === p_achievement_id)) {
      insertRow('unlocked_achievements', { user_id: uid, achievement_id: p_achievement_id, unlocked_at: nowIso(), claimed_at: null });
    }
    return null;
  },
  claim_achievement({ p_achievement_id }) {
    const uid = signedIn();
    const profile = profileOf(uid);
    const row = rows('unlocked_achievements').find((u) => u.user_id === uid && u.achievement_id === p_achievement_id);
    if (!row) throw new RpcError('Achievement not unlocked yet');
    if (!row.claimed_at) {
      patchRow('unlocked_achievements', row, { claimed_at: nowIso() });
      patchRow('profiles', profile, { points: profile.points + (ACHIEVEMENT_REWARDS[p_achievement_id] || 0) });
    }
    return profile.points;
  },
  purchase_item({ p_item_id }) {
    const uid = signedIn();
    const profile = profileOf(uid);
    const price = itemPrice(p_item_id);
    if (price == null) throw new RpcError('Unknown item');
    if (rows('owned_items').some((o) => o.user_id === uid && o.item_id === p_item_id)) throw new RpcError('You already own this item');
    if (profile.points < price) throw new RpcError('Not enough points');
    patchRow('profiles', profile, { points: profile.points - price });
    insertRow('owned_items', { user_id: uid, item_id: p_item_id, purchased_at: nowIso() });
    return profile.points;
  },
  purchase_bundle({ p_bundle_id }) {
    const uid = signedIn();
    const profile = profileOf(uid);
    const bundle = SHOP_BUNDLES.find((b) => b.id === p_bundle_id);
    if (!bundle) throw new RpcError('Unknown set');
    const ownedIds = new Set(rows('owned_items').filter((o) => o.user_id === uid).map((o) => o.item_id));
    const missing = bundle.items.filter((id) => !ownedIds.has(id));
    if (!missing.length) throw new RpcError('You already own everything in this set');
    const price = bundlePriceFor(bundle, ownedIds);
    if (profile.points < price) throw new RpcError('Not enough points');
    patchRow('profiles', profile, { points: profile.points - price });
    missing.forEach((item) => insertRow('owned_items', { user_id: uid, item_id: item, purchased_at: nowIso() }));
    return profile.points;
  },
  set_birth_date({ p_birth }) {
    const uid = signedIn();
    const row = rows('account_ages').find((a) => a.user_id === uid);
    if (row?.birth_date) throw new RpcError('Date of birth is already set');
    const age = (Date.now() - Date.parse(p_birth)) / (365.25 * 86_400_000);
    if (!(age >= 13)) throw new RpcError('You must be at least 13 to use XOXD');
    const state = age < 16 ? 'pending' : 'not_required';
    if (row) patchRow('account_ages', row, { birth_date: p_birth, consent_state: state });
    else insertRow('account_ages', { user_id: uid, birth_date: p_birth, consent_state: state, created_at: nowIso() });
    return state;
  },
  admin_list_users() {
    requireAdmin();
    return rows('auth_users').map((u) => {
      const p = profileOf(u.id) || {};
      return { id: u.id, email: u.email, display_name: p.display_name, avatar_url: p.avatar_url, is_admin: Boolean(p.is_admin), banned_until: u.banned_until, created_at: u.created_at };
    });
  },
  admin_list_reports() {
    requireAdmin();
    const open = rows('reports').filter((r) => r.status === 'open');
    const byProject = new Map();
    open.forEach((r) => {
      if (!byProject.has(r.project_id)) byProject.set(r.project_id, []);
      byProject.get(r.project_id).push(r);
    });
    return [...byProject.entries()].map(([id, list]) => {
      const p = projectOf(id) || {};
      const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {
        project_id: id, title: p.title, author_name: p.author_name, owner_id: p.user_id, published: p.published,
        report_count: list.length, reasons: [...new Set(list.map((r) => r.reason))].sort().join(', '),
        latest_note: sorted.find((r) => r.note)?.note || '', last_reported_at: sorted[0].created_at,
      };
    }).sort((a, b) => b.report_count - a.report_count);
  },
  admin_close_reports({ p_project_id, p_status }) {
    requireAdmin();
    const hit = rows('reports').filter((r) => r.project_id === p_project_id && r.status === 'open');
    hit.forEach((r) => patchRow('reports', r, { status: p_status }));
    return hit.length;
  },
  is_news_editor: () => isNewsroom(),
  can_write_newsletter: ({ p_newsletter }) => canWriteNewsletter(p_newsletter),
  my_newsletter_terms: () => newsletterTerms(),
  start_newsletter({ p_title, p_summary, p_cover_url }) {
    const uid = signedIn();
    const terms = newsletterTerms();
    if (!terms.can_start) throw new RpcError(terms.points < terms.cost ? 'Not enough points' : 'You already have 3 newsletters');
    const profile = profileOf(uid);
    if (terms.cost) patchRow('profiles', profile, { points: profile.points - terms.cost });
    const at = nowIso();
    const id = uuid();
    insertRow('newsletters', { id, title: p_title, summary: p_summary || '', cover_url: p_cover_url || '', created_by: uid, published: true, created_at: at, updated_at: at });
    return id;
  },
  admin_set_news_editor({ p_user, p_editor }) {
    requireAdmin();
    const row = rows('news_editors').find((e) => e.user_id === p_user);
    if (p_editor && !row) insertRow('news_editors', { user_id: p_user, created_at: nowIso() });
    if (!p_editor && row) removeRow('news_editors', row);
    return null;
  },
};

// The Edge Functions: admin actions do something; the rest only answer.
function invokeFunction(name, body = {}) {
  if (name === 'admin-actions') {
    requireAdmin();
    const user = rows('auth_users').find((u) => u.id === body.targetUserId);
    if (!user) throw new RpcError('No such user');
    if (body.action === 'ban') {
      patchRow('auth_users', user, { banned_until: new Date(Date.now() + (body.durationHours || 24) * 3_600_000).toISOString() });
    } else if (body.action === 'unban') {
      patchRow('auth_users', user, { banned_until: null });
    } else if (body.action === 'delete') {
      deleteAccount(user.id);
    }
    return { ok: true };
  }
  if (name === 'parental-consent') return body.action === 'confirm' ? { status: 'confirmed' } : { ok: true };
  return { ok: true };
}

function deleteAccount(uid) {
  rows('projects').filter((p) => p.user_id === uid).forEach((p) => { removeRow('projects', p); afterDelete('projects', p); });
  for (const [table, col] of [['likes', 'user_id'], ['comments', 'user_id'], ['follows', 'follower_id'], ['follows', 'following_id'],
    ['saves', 'user_id'], ['notifications', 'user_id'], ['account_ages', 'user_id'], ['owned_items', 'user_id'],
    ['unlocked_achievements', 'user_id'], ['news_editors', 'user_id'], ['profiles', 'id'], ['auth_users', 'id']]) {
    rows(table).filter((r) => r[col] === uid).forEach((r) => removeRow(table, r));
  }
}

// ------------------------------------------------------------------- auth

const listeners = new Set();
function session() {
  const user = authUser();
  return user ? { user, access_token: 'demo-token', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 } : null;
}
function emit(event) {
  const s = session();
  listeners.forEach((cb) => setTimeout(() => cb(event, s), 0));
}

export function signInAs(userId) {
  ls.set(KEY.session, userId);
  emit('SIGNED_IN');
}
export function signOut() {
  ls.del(KEY.session);
  emit('SIGNED_OUT');
}
export function currentUserId() {
  return me();
}
export function profileName(id) {
  return profileOf(id)?.display_name || '';
}
export function stats() {
  return Object.fromEntries(Object.entries(db).map(([t, list]) => [t, list.length]));
}
export const DEMO_ACCOUNTS = ACCOUNTS;

// Everything back to how it was generated: the journal, the session, the
// site's own remembered state and uploaded files. Theme stays.
export async function resetDemo() {
  let theme = null;
  try {
    theme = localStorage.getItem('theme');
    localStorage.clear();
    sessionStorage.clear();
    if (theme) localStorage.setItem('theme', theme);
  } catch { /* storage blocked: nothing kept anyway */ }
  try { await caches.delete(UPLOADS); } catch { /* no Cache API */ }
}

const ok = (data) => new Promise((r) => setTimeout(() => r({ data, error: null }), 0));
const fail = (message) => new Promise((r) => setTimeout(() => r({ data: null, error: { message } }), 0));

const auth = {
  getUser: () => ok({ user: authUser() }),
  getSession: () => ok({ session: session() }),
  onAuthStateChange(callback) {
    listeners.add(callback);
    setTimeout(() => callback('INITIAL_SESSION', session()), 0);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  signInWithPassword({ email, password }) {
    const user = rows('auth_users').find((u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase());
    // Generated accounts take any password; ones made here keep theirs.
    if (!user || (user.password && user.password !== password)) return fail('Invalid login credentials');
    if (user.banned_until && Date.parse(user.banned_until) > Date.now()) return fail('User is banned');
    signInAs(user.id);
    return ok({ user: authUser(), session: session() });
  },
  signUp({ email, password, options = {} }) {
    const address = String(email || '').trim().toLowerCase();
    if (!address.includes('@')) return fail('Unable to validate email address: invalid format');
    if (String(password || '').length < 6) return fail('Password should be at least 6 characters.');
    if (rows('auth_users').some((u) => u.email.toLowerCase() === address)) return fail('User already registered');
    const meta = options.data || {};
    const id = uuid();
    const at = nowIso();
    const name = meta.display_name || address.split('@')[0];
    insertRow('auth_users', { id, email: address, password, display_name: name, created_at: at, banned_until: null });
    insertRow('profiles', { id, display_name: name, bio: '', avatar_url: '', created_at: at, points: 0, points_earned_total: 0, equipped_bg: 'none', equipped_border: 'none', equipped_name_effect: 'none', is_admin: false });
    if (meta.birth_date) {
      const age = (Date.now() - Date.parse(meta.birth_date)) / (365.25 * 86_400_000);
      insertRow('account_ages', { user_id: id, birth_date: meta.birth_date, consent_state: age < 16 ? 'pending' : 'not_required', created_at: at });
    }
    signInAs(id);
    return ok({ user: authUser(), session: session() });
  },
  signOut() {
    signOut();
    return ok({});
  },
  resetPasswordForEmail: () => ok({}),
  updateUser({ data, password } = {}) {
    const user = rows('auth_users').find((u) => u.id === me());
    if (!user) return fail('Not signed in');
    const patch = {};
    if (data?.display_name) patch.display_name = data.display_name;
    if (password) patch.password = password;
    patchRow('auth_users', user, patch);
    emit('USER_UPDATED');
    return ok({ user: authUser() });
  },
  refreshSession: () => ok({ session: session(), user: authUser() }),
};

// ---------------------------------------------------------------- storage

// Uploaded files go into the Cache API under a URL of this site; fake/sw.js
// (served as /sw.js) answers that URL from the cache.
function storageBucket(bucket) {
  const urlFor = (path) => new URL(`${BASE}fake/uploads/${bucket}/${path}`, location.origin).href;
  return {
    async upload(path, file, options = {}) {
      try {
        const cache = await caches.open(UPLOADS);
        const type = options.contentType || file.type || 'application/octet-stream';
        await cache.put(urlFor(path), new Response(file, { headers: { 'content-type': type } }));
      } catch {
        // No Cache API (private mode): the link just will not load.
      }
      return { data: { path }, error: null };
    },
    async remove(paths) {
      try {
        const cache = await caches.open(UPLOADS);
        await Promise.all([].concat(paths).map((p) => cache.delete(urlFor(p))));
      } catch { /* nothing stored */ }
      return { data: [], error: null };
    },
    list: () => ok([]),
    getPublicUrl: (path) => ({ data: { publicUrl: urlFor(path) } }),
  };
}

export function createClient() {
  return {
    from: (table) => new Query(table),
    rpc(name, args = {}) {
      const fn = RPC[name];
      if (!fn) return fail(`Could not find the function public.${name}`);
      try {
        return ok(fn(args));
      } catch (err) {
        return fail(err.message);
      }
    },
    auth,
    storage: { from: storageBucket },
    functions: {
      invoke(name, { body } = {}) {
        try {
          return ok(invokeFunction(name, body));
        } catch (err) {
          return fail(err.message);
        }
      },
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
    removeChannel() {},
  };
}
