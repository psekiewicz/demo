# XOXD demo

The whole [XOXD](https://psekiewicz.github.io) site running against a fake
database that lives in the browser, with no Supabase. Everything works: the
feed, liking, comments, follows, the shop, achievements, news, the dashboard
and admin, sign up and sign in.

Served by GitHub Pages at `https://psekiewicz.github.io/demo/`.

## What is in the database

Made up, generated on load by `fake/seed.js`, and the same for every visitor:

| | |
| --- | --- |
| People | 323, each with a profile photo (randomuser.me) |
| Demos | 720, each with a cover and a playable "Try it" |
| Likes / comments | about 29,000 / 5,500 |
| Follows / saves | about 3,400 / 1,600 |
| Views | about 13,000 signed-in views behind the counters |
| Changelog updates | about 950 |
| News | 8 newsletters, 83 articles, likes, comments |
| Shop | owned and equipped cosmetics, achievements to claim |
| Admin | reports waiting in the queue, a welcome announcement |

What you change (likes, posts, purchases, a new account) is kept in your
browser's localStorage and replayed on top of the generated data, so it
survives a reload and never reaches anyone else.

## The Demo button

Top right (bottom left on a phone): sign in as **Demo** (admin and newsroom,
the default; its avatar is the protogen in `fake/img/protogen.webp`), **Maya**
(a creator) or **CBot** (the newsroom bot), sign up as someone new, sign out,
or reset everything. Seeded accounts take any password.

## How it is put together

| Path | What |
| --- | --- |
| `fake/backend.js` | Stand-in for `@supabase/supabase-js`: queries, auth, row rules, counters, notifications, every RPC the site calls, uploads |
| `fake/seed.js` | The generator |
| `fake/banner.js` | The Demo button |
| `fake/sw.js` | Serves uploaded files from the Cache API (copied to `sw.js`) |
| `fake/apps/` | The toys behind "Try it": snake, life, breakout, synth, drums, sketchpad, palette, flow field, timer, typing, todo |
| `fake/img/` | Demo covers (generated) and the protogen avatar |
| everything else | The site itself, copied by `tools/sync.mjs` - don't edit it here |

## Updating from the site

```sh
node tools/sync.mjs ../psekiewicz.github.io   # copy the site, rebase paths to /demo/
node tools/check.mjs                          # every page in Chromium, plus writes that must persist
```

`tools/sync.mjs` rewrites root-absolute paths to `/demo/` (set `DEMO_BASE`
for another base), points `js/supabase-init.js` at `fake/backend.js` and adds
the Demo button to every page. `fake/source.json` records which commit of the
site was copied. `tools/make-images.mjs` redraws the covers.
