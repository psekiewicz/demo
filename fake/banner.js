// The Demo button every page gets (tools/sync.mjs adds it): who you are, a
// one-tap switch to another account, and a reset back to the generated data.
import { DEMO_ACCOUNTS, signInAs, signOut, resetDemo, currentUserId, profileName, stats, BASE } from './backend.js';

const css = `
.demo-pill { position: fixed; right: 16px; top: 16px; z-index: 2000; font: 600 13px/1 system-ui, sans-serif; }
@media (max-width: 720px) { .demo-pill { top: auto; right: auto; left: 16px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); } }
.demo-pill > button { display: flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 999px; border: 1px solid var(--color-border-strong, #d6d4cf);
  background: var(--color-accent, #191713); color: var(--color-on-accent, #fff); cursor: pointer; box-shadow: var(--shadow-md, 0 6px 18px rgba(0,0,0,.12)); font: inherit; }
.demo-pill > button::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #f97316; }
.demo-menu { position: absolute; right: 0; top: calc(100% + 8px); width: min(280px, calc(100vw - 32px)); padding: 8px; border-radius: 18px;
  background: var(--color-bg, #fff); color: var(--color-text, #191713); border: 1px solid var(--color-border, #e9e8e4); box-shadow: var(--shadow-md, 0 6px 18px rgba(0,0,0,.12)); }
.demo-menu[hidden] { display: none; }
@media (max-width: 720px) { .demo-menu { top: auto; right: auto; left: 0; bottom: calc(100% + 8px); } }
.demo-menu p { margin: 6px 10px 10px; font-weight: 400; line-height: 1.4; color: var(--color-text-muted, #5c5952); }
.demo-menu button { display: block; width: 100%; text-align: left; padding: 10px; border: 0; border-radius: 12px; background: none; color: inherit; font: inherit; cursor: pointer; }
.demo-menu button:hover, .demo-menu button:focus-visible { background: var(--color-surface, #f6f5f3); }
.demo-menu button[aria-current='true'] { color: var(--color-primary, #1f7a99); }
.demo-menu hr { border: 0; border-top: 1px solid var(--color-border, #e9e8e4); margin: 6px 0; }
.demo-menu .danger { color: var(--color-danger, #b3261e); }
`;

function render() {
  const root = document.createElement('div');
  root.className = 'demo-pill';
  const uid = currentUserId();
  const s = stats();
  const n = (x) => x.toLocaleString('en-GB');
  const accounts = [
    [DEMO_ACCOUNTS.demo.id, 'Demo (admin)'],
    [DEMO_ACCOUNTS.maya.id, 'Maya (creator)'],
    [DEMO_ACCOUNTS.cbot.id, 'CBot (newsroom)'],
  ];
  root.innerHTML = `
    <button type="button" aria-expanded="false" aria-controls="demo-menu">Demo</button>
    <div class="demo-menu" id="demo-menu" hidden>
      <p>Fake data, only in this browser: ${n(s.profiles)} people, ${n(s.projects)} demos, ${n(s.likes)} likes, ${n(s.comments)} comments.</p>
      <p>${uid ? `Signed in as <strong></strong>.` : 'Signed out.'}</p>
      ${accounts.map(([id, label]) => `<button type="button" data-as="${id}" aria-current="${id === uid}">Sign in as ${label}</button>`).join('')}
      <button type="button" data-as="new">Sign up as someone new</button>
      ${uid ? '<button type="button" data-out>Sign out</button>' : ''}
      <hr />
      <button type="button" class="danger" data-reset>Reset data</button>
    </div>`;
  if (uid) root.querySelector('strong').textContent = profileName(uid);

  const toggle = root.querySelector('button');
  const menu = root.querySelector('.demo-menu');
  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', (e) => !root.contains(e.target) && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  root.querySelectorAll('[data-as]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.as === 'new') {
        signOut();
        location.href = `${BASE}register`;
        return;
      }
      signInAs(btn.dataset.as);
      location.reload();
    }),
  );
  root.querySelector('[data-out]')?.addEventListener('click', () => {
    signOut();
    location.reload();
  });
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    if (!confirm('Reset the demo? Everything you changed goes.')) return;
    await resetDemo();
    location.href = BASE;
  });
  return root;
}

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
const mount = () => document.body.appendChild(render());
if (document.body) mount();
else document.addEventListener('DOMContentLoaded', mount);
