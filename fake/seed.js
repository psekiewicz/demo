// Builds the demo's database: a few hundred people, several hundred demos and
// the likes, comments, follows, views, changelogs, saves, news, shop purchases
// and reports between them. Everything is made up, and the same every time
// (a seeded random generator), so a reset always gives back the same world.
//
// Row shapes follow schema.sql in the XOXD repo, so the site's own data
// modules read them as they would the real database.

export const ACCOUNTS = {
  demo: { id: 'de300000-0000-4000-8000-000000000001', email: 'demo@xoxd.dev', name: 'Demo' },
  maya: { id: 'de300000-0000-4000-8000-000000000002', email: 'maya@xoxd.dev', name: 'Maya Chen' },
  cbot: { id: '176c749c-dd5b-4aee-b184-aa59381e9d1d', email: 'cbot@xoxd.dev', name: 'CBot' },
};

const SIZES = { people: 320, projects: 720 };

// Achievement rewards: achievement_defs in schema.sql.
export const ACHIEVEMENT_REWARDS = {
  launched: 20, builder: 60, prolific: 90, 'well-liked': 30, 'crowd-favorite': 100, icon: 150, veteran: 50,
  'old-timer': 90, conversationalist: 40, chatterbox: 70, influencer: 80, popular: 140, 'social-butterfly': 25,
  viral: 90, reached: 120, 'talked-about': 80, collector: 70, trendsetter: 60, 'all-set': 15, shipper: 40,
  maintainer: 60, completionist: 500,
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Maya', 'Kuba', 'Lena', 'Oskar', 'Ines', 'Tomek', 'Zoe', 'Arjun', 'Hana', 'Mateo', 'Noor', 'Felix', 'Ada',
  'Igor', 'Sofia', 'Leo', 'Amara', 'Jonas', 'Mila', 'Ravi', 'Yuki', 'Emil', 'Clara', 'Diego', 'Freya', 'Omar', 'Nina',
  'Pavel', 'Iris', 'Theo', 'Aiko', 'Bruno', 'Elif', 'Hugo', 'Lucia', 'Marek', 'Priya', 'Sam', 'Tara', 'Viktor',
  'Wren', 'Ola', 'Kenji', 'Ana', 'Basia', 'Eryk', 'Jade', 'Kai', 'Lior', 'Mona', 'Nils', 'Pia', 'Rosa', 'Sven',
  'Uma', 'Vera', 'Wiktor', 'Xenia', 'Yara', 'Zuza', 'Alex', 'Bea', 'Cyprian', 'Dora', 'Edgar', 'Fatima', 'Gosia'];
const LAST = ['Chen', 'Nowak', 'Kim', 'Silva', 'Novak', 'Rossi', 'Haddad', 'Berg', 'Sato', 'Okafor', 'Lind', 'Moreau',
  'Kowalski', 'Patel', 'Lopez', 'Fischer', 'Ivanova', 'Tanaka', 'Wright', 'Duda', 'Zielinska', 'Costa', 'Ahmed',
  'Larsen', 'Wojcik', 'Mendes', 'Park', 'Horvat', 'Kaczmarek', 'Abe'];
const HANDLE = ['pixel', 'byte', 'loop', 'noise', 'tiny', 'glitch', 'echo', 'void', 'mint', 'neon', 'retro', 'lofi',
  'ascii', 'vector', 'quiet', 'orbit', 'paper', 'static', 'cosmic', 'cozy'];
const HANDLE_END = ['dev', 'makes', 'works', 'lab', 'studio', 'hq', 'builds', 'cat', 'fox', 'bot', 'craft'];

const BIOS = [
  'Building small things on weekends.', 'Frontend by day, synths by night.', 'I make tiny games and bigger messes.',
  'Generative art, mostly circles.', 'Student. Learning by shipping.', 'Indie dev, coffee-powered.',
  'Making tools I wish existed.', 'Sound design and web audio.', 'Pixel art and procedural worlds.',
  'Open source, open notebook.', 'Ex-designer, now writing code.', 'Teaching kids to code, sharing what we make.',
  'Retro computing nerd.', 'Data viz and maps.', 'One demo a week, every week.', '', '', '',
];

// What the demos are. Each kind has words for its titles, tags, and the
// playable toy (fake/apps) its "Try it" opens.
const KINDS = [
  { type: 'app', app: 'snake', nouns: ['Snake', 'Serpent', 'Worm Run', 'Tail Chase'], tags: ['game', 'arcade', 'canvas'] },
  { type: 'app', app: 'life', nouns: ['Life', 'Cell Garden', 'Automata', 'Colony'], tags: ['simulation', 'cellular-automata', 'canvas'] },
  { type: 'app', app: 'pomodoro', nouns: ['Timer', 'Focus', 'Pomodoro', 'Deep Work'], tags: ['productivity', 'tools'] },
  { type: 'app', app: 'typing', nouns: ['Typing Race', 'Keys', 'Type Trainer', 'WPM'], tags: ['game', 'typing', 'tools'] },
  { type: 'app', app: 'todo', nouns: ['Todo', 'Checklist', 'Kanban', 'Habit Loop', 'Planner'], tags: ['productivity', 'tools', 'local-first'] },
  { type: 'app', app: 'breakout', nouns: ['Breakout', 'Bricks', 'Paddle', 'Bounce'], tags: ['game', 'arcade', 'canvas'] },
  { type: 'music', app: 'synth', nouns: ['Synth', 'Keys', 'Organ', 'Theremin', 'Drone'], tags: ['web-audio', 'music', 'synth'] },
  { type: 'music', app: 'drums', nouns: ['Drum Machine', 'Sequencer', 'Beat Grid', 'Looper', '808'], tags: ['web-audio', 'music', 'beats'] },
  { type: 'image', app: 'paint', nouns: ['Sketchpad', 'Paint', 'Doodle', 'Ink'], tags: ['drawing', 'canvas', 'art'] },
  { type: 'image', app: 'palette', nouns: ['Palette', 'Colors', 'Swatches', 'Gradient Lab'], tags: ['design', 'color', 'tools'] },
  { type: 'image', app: 'flow', nouns: ['Flow Field', 'Particles', 'Mandala', 'Starfield', 'Spirograph'], tags: ['generative', 'art', 'canvas'] },
  { type: 'video', app: 'flow', nouns: ['Visualizer', 'Motion Study', 'Loop', 'Shader Reel'], tags: ['motion', 'generative', 'webgl'] },
  { type: 'other', app: 'palette', nouns: ['Experiment', 'Prototype', 'Playground', 'Sandbox'], tags: ['experiment', 'web'] },
];
const ADJ = ['Pocket', 'Tiny', 'Neon', 'Quiet', 'Lazy', 'Pixel', 'Paper', 'Turbo', 'Retro', 'Cozy', 'Hyper', 'Micro',
  'Midnight', 'Analog', 'Velvet', 'Cosmic', 'Little', 'Infinite', 'Lo-fi', 'Mono', 'Solar', 'Frosty', 'Wobbly', 'Zen',
  'Glass', 'Rusty', 'Electric', 'Soft', 'Bitwise', 'Atomic'];
const STACKS = ['vanilla JS', 'TypeScript', 'Svelte', 'React', 'Vue', 'Canvas 2D', 'WebGL', 'Web Audio', 'Rust + WASM',
  'Three.js', 'p5.js', 'Lit', 'Solid', 'Go + WASM', 'Elm'];
const SUMMARIES = [
  'Made it in a weekend, kept it because it is fun.', 'Small, fast and works offline.',
  'My first thing with {stack}.', 'Everything runs in your browser, nothing is uploaded.',
  'A tiny toy that got out of hand.', 'Built for my sister, now for everyone.', 'Rewritten for the third time. This one sticks.',
  'Try it on your phone too.', 'Started as a joke, then people used it.', 'Under 10 KB of {stack}.',
  'Inspired by an old DOS program.', 'Built live on stream over four evenings.', 'No accounts, no tracking, just the thing.',
];
const COMMENTS = [
  'This is so good.', 'Love the colors!', 'How did you do the animation?', 'Bookmarked, using this daily.',
  'Works great on my phone.', 'The sound on this is lovely.', 'Any plans for a dark mode?', 'Ha, I lost an hour to this.',
  'Is the source up anywhere?', 'Small bug: it resets when I rotate the screen.', 'Clean. Really clean.',
  'This deserves more likes.', 'Showed this to my class, they loved it.', 'What did you use for the physics?',
  'Can you add keyboard shortcuts?', 'The new update is a big step up.', 'Simple and it just works.',
  'Feels like 1998 in the best way.', 'Made me want to build something tonight.', 'Wow, under 10 KB?',
  'Please never change the font.', 'My cat tried to catch the particles.', 'Would pay for this.', 'Neat idea!',
  'Got 87 WPM, beat that.', 'The settings panel is really thoughtful.', 'Smooth on an old laptop too.',
  'Ok this is my new favorite.', 'Huge improvement since v0.2.', 'Added it to my home screen.',
];
const UPDATES = [
  'Added a dark theme.', 'Fixed the bug where scores did not save.', 'New sounds and a volume slider.',
  'Faster on phones - about twice the frame rate.', 'Keyboard shortcuts, finally.', 'Rewrote the renderer.',
  'Added sharing: copy a link to what you made.', 'Settings now persist between visits.', 'Touch controls.',
  'New color presets, thanks for the suggestions.', 'Smaller download, same features.', 'First public version.',
  'Accessibility pass: focus outlines and labels.', 'Added an undo button.', 'Works offline now.',
];

const NEWS_HEADLINES = [
  ['A big open-world sequel gets a release window', 'Gameplay footage shows a much bigger map.'],
  ['Handheld console sales pass a new milestone', 'The small screen keeps winning.'],
  ['Browser engine ships faster JavaScript startup', 'Pages should feel snappier this month.'],
  ['Indie puzzle game tops the charts', 'A two-person studio, four years of work.'],
  ['New open-source font for coders lands', 'Ligatures optional, as it should be.'],
  ['Game streaming service adds offline mode', 'Downloads for long trips, at last.'],
  ['A retro remaster surprises fans', 'Original soundtrack included, remixed too.'],
  ['Web GPU support reaches more browsers', 'More shaders, fewer plugins.'],
  ['Speedrun record falls after nine years', 'A frame-perfect trick did it.'],
  ['VR headset gets a cheaper model', 'Lighter, cheaper, same lenses.'],
  ['Studio announces a co-op roguelike', 'Four players, one very angry dungeon.'],
  ['A beloved strategy series returns', 'Turn-based, hex grid, the works.'],
  ['Phone makers race to the thinnest model', 'Battery life is the question.'],
  ['Game jam breaks its entry record', 'Over 9,000 games in 48 hours.'],
  ['Cloud saves arrive on a popular handheld', 'Switch devices without losing progress.'],
  ['A new programming language hits 1.0', 'Fast builds and friendly errors.'],
];
const LETTERS = [
  { title: 'Pixel Post', summary: 'Pixel art, tiny games and the people who make them.' },
  { title: 'Web Audio Weekly', summary: 'Synths, sequencers and noise in the browser.' },
  { title: 'Small Tools Club', summary: 'Useful little apps, one email at a time.' },
  { title: 'Generative Sundays', summary: 'Code that draws, every Sunday.' },
  { title: 'Ship Log', summary: 'What XOXD makers shipped this month.' },
  { title: 'Retro Corner', summary: 'Old machines, new demos.' },
];

export function generate({ base = '/', now = Date.now() } = {}) {
  const rnd = mulberry32(20261026);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));
  const chance = (p) => rnd() < p;
  const hex = (n) => Math.floor(rnd() * 16 ** n).toString(16).padStart(n, '0');
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(rnd() * 4)).toString(16)}${hex(3)}-${hex(6)}${hex(6)}`;
  const iso = (ms) => new Date(ms).toISOString();
  const H = 3_600_000;
  const D = 24 * H;
  // Most things happened recently: a skew towards now.
  const recent = (maxDays) => now - Math.pow(rnd(), 2.2) * maxDays * D - rnd() * H;
  const between = (from, to = now) => from + rnd() * Math.max(0, to - from);
  const img = (kind, n) => `${base}fake/img/${kind}-${n}.svg`;

  const db = {
    auth_users: [],
    profiles: [],
    projects: [],
    likes: [],
    comments: [],
    follows: [],
    project_updates: [],
    project_views: [],
    saves: [],
    notifications: [],
    account_ages: [],
    unlocked_achievements: [],
    owned_items: [],
    reports: [],
    announcements: [],
    news_editors: [],
    newsletters: [],
    news_articles: [],
    newsletter_editors: [],
    news_likes: [],
    news_comments: [],
    news_reads: [],
  };

  // ------------------------------------------------------------- people
  const usedNames = new Set();
  function personName() {
    for (;;) {
      const style = rnd();
      const name =
        style < 0.55 ? `${pick(FIRST)} ${pick(LAST)}`
          : style < 0.8 ? `${pick(HANDLE)}.${pick(HANDLE_END)}`
            : style < 0.92 ? `${pick(FIRST)} ${pick(LAST)[0]}.`
              : `${pick(FIRST).toLowerCase()}${int(1, 99)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  }

  // Profile photos: real portraits from randomuser.me (100 women, 100 men),
  // handed out in turn so repeats are as far apart as they can be.
  const FEMALE = new Set(['Maya', 'Lena', 'Ines', 'Zoe', 'Hana', 'Noor', 'Ada', 'Sofia', 'Amara', 'Mila', 'Yuki', 'Clara',
    'Freya', 'Nina', 'Iris', 'Aiko', 'Elif', 'Lucia', 'Priya', 'Tara', 'Wren', 'Ola', 'Ana', 'Basia', 'Jade', 'Mona', 'Pia',
    'Rosa', 'Uma', 'Vera', 'Xenia', 'Yara', 'Zuza', 'Bea', 'Dora', 'Fatima', 'Gosia']);
  const photoTurn = { women: int(0, 99), men: int(0, 99) };
  function photo(name) {
    const first = name.split(/[\s.]/)[0].replace(/\d+$/, '');
    const known = FIRST.find((f) => f.toLowerCase() === first.toLowerCase());
    const set = known ? (FEMALE.has(known) ? 'women' : 'men') : chance(0.5) ? 'women' : 'men';
    photoTurn[set] = (photoTurn[set] + 37) % 100;
    return `https://randomuser.me/api/portraits/${set}/${photoTurn[set]}.jpg`;
  }

  function addPerson(id, name, email, extra = {}) {
    const created = extra.created_at || iso(recent(900) - 30 * D);
    db.auth_users.push({ id, email, display_name: name, created_at: created, banned_until: null });
    const profile = {
      id,
      display_name: name,
      bio: pick(BIOS),
      avatar_url: photo(name),
      created_at: created,
      points: 0,
      points_earned_total: 0,
      equipped_bg: 'none',
      equipped_border: 'none',
      equipped_name_effect: 'none',
      is_admin: false,
      ...extra,
    };
    db.profiles.push(profile);
    db.account_ages.push({
      user_id: id,
      birth_date: `${int(1975, 2006)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      consent_state: 'not_required',
      created_at: created,
    });
    return profile;
  }

  const demo = addPerson(ACCOUNTS.demo.id, ACCOUNTS.demo.name, ACCOUNTS.demo.email, {
    bio: 'The account this demo signs you in as. Admin and news editor, so every screen is open.',
    // The one drawn avatar: a protogen in an Arch hoodie.
    avatar_url: `${base}fake/img/protogen.webp`,
    is_admin: true,
    created_at: iso(now - 800 * D),
  });
  const maya = addPerson(ACCOUNTS.maya.id, ACCOUNTS.maya.name, ACCOUNTS.maya.email, {
    bio: 'Web audio, tiny synths and the occasional game.',
    avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    created_at: iso(now - 500 * D),
  });
  const cbot = addPerson(ACCOUNTS.cbot.id, ACCOUNTS.cbot.name, ACCOUNTS.cbot.email, {
    bio: 'I write XOXD T&G Weekly every Saturday.',
    avatar_url: 'https://robohash.org/cbot.png?size=256x256',
    created_at: iso(now - 400 * D),
  });
  for (let i = 0; i < SIZES.people; i++) {
    const name = personName();
    const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
    addPerson(uuid(), name, `${handle}@example.com`);
  }
  const people = db.profiles;
  const others = people.filter((p) => p.id !== cbot.id);
  // How much each person makes and how popular they are: a long tail.
  const weight = new Map(others.map((p) => [p.id, Math.pow(rnd(), 3)]));
  weight.set(demo.id, 0.6);
  weight.set(maya.id, 0.9);

  // A picker that favours heavier items: cumulative weights and a binary
  // search, since it runs tens of thousands of times.
  function weightedPicker(list, w) {
    const sums = [];
    let total = 0;
    for (const x of list) sums.push((total += w(x)));
    return () => {
      const r = rnd() * total;
      let lo = 0;
      let hi = sums.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sums[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      return list[lo];
    };
  }
  const weighted = (list, w) => weightedPicker(list, w)();

  // ----------------------------------------------------------- projects
  const usedTitles = new Set();
  const creators = others.filter((p) => weight.get(p.id) > 0.05 || p.id === demo.id);
  const owned = new Map();
  function addProject(owner, extra = {}) {
    const kind = pick(KINDS);
    let title;
    do title = `${pick(ADJ)} ${pick(kind.nouns)}`;
    while (usedTitles.has(title) && usedTitles.size < 2000);
    usedTitles.add(title);
    const stack = pick(STACKS);
    const created = recent(420);
    const published = chance(0.92);
    const live = published ? chance(0.9) : chance(0.4);
    const id = uuid();
    const tags = [...new Set([...kind.tags.filter(() => chance(0.7)), chance(0.3) ? stack.toLowerCase().split(' ')[0] : null].filter(Boolean))];
    const hasRepo = chance(0.55);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const project = {
      id,
      user_id: owner.id,
      author_name: owner.display_name,
      title,
      summary: pick(SUMMARIES).replace('{stack}', stack),
      description: [
        `## What it is`,
        ``,
        `**${title}** is a small ${kind.type === 'app' ? 'app' : kind.type} I built with ${stack}. ${pick(SUMMARIES).replace('{stack}', stack)}`,
        ``,
        `## How to use it`,
        ``,
        `- Press **Try it** and it opens right away`,
        `- Works with mouse, touch and keyboard`,
        `- ${pick(['Nothing to install', 'Your settings stay in the browser', 'Share a link to what you made'])}`,
        ``,
        `## Built with`,
        ``,
        `${stack}${chance(0.5) ? `, about ${int(2, 40) * 50} lines of code` : ''}. ${chance(0.5) ? 'Feedback welcome in the comments.' : 'Next up: ' + pick(['sound', 'a level editor', 'themes', 'multiplayer', 'mobile polish']) + '.'}`,
      ].join('\n'),
      image_url: chance(0.85) ? img('cover', int(0, 71)) : '',
      tags,
      repo_url: hasRepo ? `https://github.com/example/${slug}` : '',
      live_url: live ? `${base}fake/apps/${kind.app}.html?title=${encodeURIComponent(title)}&seed=${int(1, 9999)}` : '',
      project_type: kind.type,
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      media_url: '',
      scroll_image_url: '',
      scroll_bg: '',
      published,
      created_at: iso(created),
      updated_at: iso(created),
      ...extra,
    };
    db.projects.push(project);
    if (!owned.has(owner.id)) owned.set(owner.id, []);
    owned.get(owner.id).push(project);
    return project;
  }

  for (let i = 0; i < 12; i++) addProject(demo, { published: i < 10, created_at: iso(recent(300)) });
  for (let i = 0; i < 9; i++) addProject(maya, { published: true });
  const pickCreator = weightedPicker(creators, (p) => weight.get(p.id));
  while (db.projects.length < SIZES.projects) addProject(pickCreator());
  // The demo account has one of each state: a draft with no link.
  owned.get(demo.id)[11].live_url = '';

  const projects = db.projects;
  const live = projects.filter((p) => p.published);
  const popularity = new Map(live.map((p) => [p.id, Math.pow(rnd(), 2.5) * (0.4 + weight.get(p.user_id))]));
  // The demo account's own entries do well enough to show numbers.
  owned.get(demo.id).forEach((p) => popularity.set(p.id, 0.15 + rnd() * 0.35));

  const times = new Map();
  const when = (p) => {
    if (!times.has(p)) times.set(p, Date.parse(p.created_at));
    return times.get(p);
  };
  const notify = (userId, actorId, type, projectId, at) => {
    if (userId === actorId) return;
    if (![demo.id, maya.id].includes(userId)) return;
    db.notifications.push({
      id: db.notifications.length + 1,
      user_id: userId,
      actor_id: actorId,
      type,
      project_id: projectId,
      created_at: iso(at),
      read_at: now - at > 3 * D ? iso(at + H) : null,
    });
  };

  // -------------------------------------------------- likes and comments
  const pickFan = weightedPicker(others, (x) => 0.2 + weight.get(x.id));
  for (const p of live) {
    const pop = popularity.get(p.id);
    const likers = new Set();
    const nLikes = Math.min(others.length - 1, Math.round(pop * 160 + rnd() * 4));
    while (likers.size < nLikes) {
      const u = pickFan();
      if (u.id !== p.user_id) likers.add(u.id);
    }
    for (const uid of likers) {
      const at = between(when(p));
      db.likes.push({ project_id: p.id, user_id: uid, created_at: iso(at) });
      notify(p.user_id, uid, 'like', p.id, at);
    }
    p.likes_count = likers.size;

    const nComments = Math.round(pop * 30 + (chance(0.4) ? int(0, 3) : 0));
    for (let i = 0; i < nComments; i++) {
      const author = chance(0.12) ? people.find((x) => x.id === p.user_id) : pick(others);
      const at = between(when(p));
      db.comments.push({
        id: uuid(),
        project_id: p.id,
        user_id: author.id,
        author_name: author.display_name,
        body: author.id === p.user_id ? pick(['Thanks everyone!', 'Fixed in the latest update.', 'Good idea, adding it.', 'Source link is in the description.']) : pick(COMMENTS),
        created_at: iso(at),
      });
      notify(p.user_id, author.id, 'comment', p.id, at);
    }
    p.comments_count = nComments;

    // Views: a count on the row, plus the signed-in viewers behind it (the
    // reputation view counts distinct viewers; the dashboard charts them).
    const viewers = Math.max(nLikes, Math.round(pop * 260 + rnd() * 12));
    p.views_count = viewers + Math.round(viewers * (0.3 + rnd() * 1.5));
    const keep = Math.min(viewers, p.user_id === demo.id ? 120 : 24);
    for (let i = 0; i < keep; i++) {
      db.project_views.push({ project_id: p.id, viewer_id: pick(others).id, created_at: iso(p.user_id === demo.id ? now - Math.pow(rnd(), 1.5) * 30 * D : between(when(p))) });
    }
  }

  // ------------------------------------------------------------- follows
  const followSet = new Set();
  const follow = (a, b, at) => {
    const key = `${a}>${b}`;
    if (a === b || followSet.has(key)) return;
    followSet.add(key);
    db.follows.push({ follower_id: a, following_id: b, created_at: iso(at) });
    notify(b, a, 'follow', null, at);
  };
  const pickStar = weightedPicker(others, (x) => 0.02 + weight.get(x.id) * 3);
  for (const person of others) {
    const n = Math.round(Math.pow(rnd(), 1.6) * 30);
    for (let i = 0; i < n; i++) follow(person.id, pickStar().id, recent(300));
  }
  for (let i = 0; i < 40; i++) follow(pick(others).id, demo.id, recent(200));
  for (let i = 0; i < 18; i++) follow(demo.id, weighted(others, (x) => weight.get(x.id)).id, recent(300));
  follow(demo.id, maya.id, now - 50 * D);

  // --------------------------------------------------- changelog updates
  for (const p of live) {
    if (!chance(p.user_id === demo.id ? 0.9 : 0.45)) continue;
    const n = int(1, 6);
    const stamps = Array.from({ length: n }, () => between(when(p))).sort((a, b) => a - b);
    stamps.forEach((at, i) => {
      db.project_updates.push({
        id: uuid(),
        project_id: p.id,
        user_id: p.user_id,
        version: chance(0.8) ? `v0.${i + 1}` : '',
        body: i === 0 ? 'First public version.' : pick(UPDATES),
        created_at: iso(at),
      });
      p.updated_at = iso(Math.max(when(p), at));
      if (p.user_id !== demo.id && followSet.has(`${demo.id}>${p.user_id}`)) {
        db.notifications.push({ id: db.notifications.length + 1, user_id: demo.id, actor_id: p.user_id, type: 'update', project_id: p.id, created_at: iso(at), read_at: now - at > 2 * D ? iso(at) : null });
      }
    });
  }
  for (const p of live) {
    if (p.user_id !== demo.id && followSet.has(`${demo.id}>${p.user_id}`)) {
      db.notifications.push({ id: db.notifications.length + 1, user_id: demo.id, actor_id: p.user_id, type: 'post', project_id: p.id, created_at: p.created_at, read_at: now - when(p) > 2 * D ? p.created_at : null });
    }
  }

  // --------------------------------------------------------------- saves
  const pickPopular = weightedPicker(live, (x) => popularity.get(x.id) + 0.01);
  const saved = new Set();
  const save = (u, p) => {
    if (p.user_id === u.id || saved.has(`${u.id}|${p.id}`)) return;
    saved.add(`${u.id}|${p.id}`);
    db.saves.push({ user_id: u.id, project_id: p.id, created_at: iso(between(when(p))) });
  };
  for (let i = 0; i < 1600; i++) save(pick(others), pickPopular());
  for (let i = 0; i < 14; i++) save(demo, pickPopular());

  // ------------------------------------------------------ shop and points
  const ITEMS = ['bg-paper', 'bg-sunset', 'bg-paws', 'bg-beach', 'bg-terminal', 'bg-snow', 'bg-blocks', 'bg-vhs', 'bg-aurora',
    'border-ink', 'border-double', 'border-collar', 'border-sun', 'border-gold', 'border-frost', 'border-glitch', 'border-flame',
    'name-caps', 'name-gradient', 'name-woof', 'name-tropic', 'name-terminal', 'name-oxygene', 'name-ice', 'name-gold', 'name-glitch'];
  for (const person of others) {
    if (person.id === demo.id || !chance(0.3 + weight.get(person.id))) continue;
    const mine = new Set(Array.from({ length: int(1, 5) }, () => pick(ITEMS)));
    mine.forEach((item) => db.owned_items.push({ user_id: person.id, item_id: item, purchased_at: iso(recent(200)) }));
    const of = (prefix) => [...mine].find((x) => x.startsWith(prefix));
    if (chance(0.7)) person.equipped_bg = of('bg-') || 'none';
    if (chance(0.7)) person.equipped_border = of('border-') || 'none';
    if (chance(0.7)) person.equipped_name_effect = of('name-') || 'none';
    person.points = int(0, 400);
  }
  ['bg-aurora', 'border-gold', 'name-gradient', 'border-ink', 'bg-paper'].forEach((item) =>
    db.owned_items.push({ user_id: demo.id, item_id: item, purchased_at: iso(recent(100)) }));
  Object.assign(demo, { equipped_bg: 'bg-aurora', equipped_border: 'border-gold', equipped_name_effect: 'name-gradient' });

  // Earned achievements: claimed long ago, plus a few waiting to be claimed.
  ['launched', 'builder', 'prolific', 'well-liked', 'crowd-favorite', 'veteran', 'old-timer', 'influencer', 'shipper', 'all-set', 'trendsetter', 'collector']
    .forEach((id, i) => db.unlocked_achievements.push({ user_id: demo.id, achievement_id: id, claimed_at: i < 8 ? iso(recent(200)) : null }));
  ['launched', 'builder', 'well-liked', 'shipper'].forEach((id) =>
    db.unlocked_achievements.push({ user_id: maya.id, achievement_id: id, claimed_at: iso(recent(200)) }));
  demo.points = 1240;
  maya.points = 310;

  // --------------------------------------------------------------- news
  db.news_editors.push({ user_id: cbot.id, created_at: iso(now - 400 * D) }, { user_id: demo.id, created_at: iso(now - 300 * D) });
  const weekly = { id: uuid(), title: 'XOXD T&G Weekly', summary: 'Tech and gaming news of the week, every Saturday.', cover_url: img('cover', 3), created_by: cbot.id, published: true, created_at: iso(now - 220 * D), updated_at: iso(now - 220 * D) };
  db.newsletters.push(weekly);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (ms) => `${new Date(ms).getDate()} ${MONTHS[new Date(ms).getMonth()]}`;
  const lastSaturday = now - (((new Date(now).getDay() + 1) % 7) * D);
  const linkTo = (p) => `${base}project?id=${p.id}`;
  const playable = live.filter((p) => p.live_url);
  for (let w = 0; w < 30; w++) {
    const at = lastSaturday - w * 7 * D;
    const stories = Array.from({ length: 4 }, () => pick(NEWS_HEADLINES));
    const demos = playable.filter((p) => Math.abs(when(p) - at) < 7 * D).slice(0, 3);
    const picks = demos.length ? demos : [pick(playable)];
    db.news_articles.push({
      id: uuid(), newsletter_id: weekly.id, author_id: cbot.id, author_name: 'CBot',
      title: `XOXD T&G Weekly - ${fmt(at - 7 * D)} - ${fmt(at)}`,
      lead: stories[0][1],
      body: [
        '## Top stories', '',
        ...stories.map(([h, l]) => `- **${h}.** ${l}`), '',
        '## New on XOXD', '',
        ...picks.map((p) => `- **${p.title}** by ${p.author_name} - ${p.summary} [Try it on XOXD](${linkTo(p)})`),
      ].join('\n'),
      image_url: img('cover', int(0, 71)), source_name: '', source_url: '',
      likes_count: 0, comments_count: 0, created_at: iso(at), updated_at: iso(at),
    });
  }
  LETTERS.forEach((letter, i) => {
    const owner = i === 0 ? maya : i === 4 ? demo : weighted(others, (x) => weight.get(x.id));
    const created = recent(300);
    const nl = { id: uuid(), title: letter.title, summary: letter.summary, cover_url: img('cover', int(0, 71)), created_by: owner.id, published: true, created_at: iso(created), updated_at: iso(created) };
    db.newsletters.push(nl);
    if (chance(0.5)) db.newsletter_editors.push({ newsletter_id: nl.id, user_id: pick(others).id, created_at: iso(created) });
    const n = int(3, 12);
    for (let a = 0; a < n; a++) {
      const at = between(created);
      const p = pick(playable);
      db.news_articles.push({
        id: uuid(), newsletter_id: nl.id, author_id: owner.id, author_name: owner.display_name,
        title: pick([`Ten ${pick(KINDS).nouns[0].toLowerCase()} demos worth a look`, `Interview: how ${p.author_name} built ${p.title}`, `This month in ${letter.title}`, `${p.title}, reviewed`, `Notes from a weekend of building`, `Tools I keep coming back to`]),
        lead: pick(SUMMARIES).replace('{stack}', pick(STACKS)),
        body: `## The pick\n\n**${p.title}** by ${p.author_name}. ${p.summary}\n\n[Open it on XOXD](${linkTo(p)})\n\n## Also good\n\n- ${pick(COMMENTS)}\n- ${pick(COMMENTS)}\n\nThat's it for this one. Reply in the comments with what you're building.`,
        image_url: chance(0.7) ? img('cover', int(0, 71)) : '', source_name: '', source_url: '',
        likes_count: 0, comments_count: 0, created_at: iso(at), updated_at: iso(at),
      });
    }
  });
  // A draft newsletter only the newsroom sees.
  db.newsletters.push({ id: uuid(), title: 'Launch Notes (draft)', summary: 'Not published yet.', cover_url: '', created_by: demo.id, published: false, created_at: iso(now - 2 * D), updated_at: iso(now - 2 * D) });

  for (const article of db.news_articles) {
    const likers = new Set(Array.from({ length: int(0, 40) }, () => pick(others).id));
    likers.forEach((uid) => db.news_likes.push({ article_id: article.id, user_id: uid, created_at: iso(between(Date.parse(article.created_at))) }));
    article.likes_count = likers.size;
    const nc = int(0, 6);
    for (let i = 0; i < nc; i++) {
      const u = pick(others);
      db.news_comments.push({ id: uuid(), article_id: article.id, user_id: u.id, author_name: u.display_name, body: pick(['Great issue.', 'Good week.', 'Thanks for featuring this!', 'Did not know about that one.', 'More of these please.', 'Saving this for later.']), created_at: iso(between(Date.parse(article.created_at))) });
    }
    article.comments_count = nc;
    if (Date.parse(article.created_at) < now - 14 * D && chance(0.7)) {
      db.news_reads.push({ user_id: demo.id, article_id: article.id, read_at: iso(Date.parse(article.created_at) + D) });
    }
  }

  // ------------------------------------------------------------- reports
  const REASONS = ['broken', 'spam', 'stolen', 'nsfw', 'other'];
  for (let i = 0; i < 9; i++) {
    const p = pick(live);
    const n = int(1, 4);
    for (let r = 0; r < n; r++) {
      db.reports.push({ id: uuid(), project_id: p.id, reporter_id: pick(others).id, reason: pick(REASONS), note: chance(0.5) ? pick(['Link opens a blank page.', 'Looks copied from another site.', 'Posted three times.', '']) : '', status: 'open', created_at: iso(recent(20)) });
    }
  }

  db.announcements.push({
    id: uuid(),
    title: 'Welcome to the XOXD demo',
    body: 'Everything here is made up and lives only in this browser. Like, comment, buy, publish - nothing reaches anyone.\n\nThe Demo button in the corner signs you in as someone else or resets the data.',
    attachments: [],
    active: true,
    expires_at: null,
    created_by: demo.id,
    created_at: iso(now - H),
  });

  db.notifications.sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((n, i) => (n.id = i + 1));
  return db;
}
