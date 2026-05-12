// Strategy Partners — interactions

// ============ Render cases ============
(function renderCases() {
  const root = document.querySelector('[data-cases]');
  if (!root) return;
  root.innerHTML = window.SP_CASES.map((c, i) => `
    <li class="case" data-case="${i}">
      <div class="case-index">
        <span class="case-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="case-role">${c.role}</span>
      </div>
      <div class="case-headline">
        <h3 class="case-archetype">${c.archetype}</h3>
        <p class="case-desc">${c.desc}</p>
      </div>
      <div class="case-sector">${c.sector}</div>
      <div class="case-arrow">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="case-detail">${c.detail}</div>
    </li>
  `).join('');
  root.addEventListener('click', e => {
    const li = e.target.closest('.case');
    if (!li) return;
    li.classList.toggle('is-open');
  });
})();

// ============ Render team ============
(function renderTeam() {
  const root = document.querySelector('[data-team]');
  if (!root) return;
  root.innerHTML = window.SP_TEAM.map(m => `
    <article class="member" data-member-id="${m.id}" data-tags="${m.tags.join(' ')}">
      <div class="member-head">
        <div class="member-portrait" data-initials="${m.initials}" data-tone="${m.tone}" style="background: ${m.tone === 'ink' ? 'linear-gradient(135deg,#354a87,#1e2d52)' : 'linear-gradient(135deg,#6478a8,#435ba1)'}"></div>
        <div class="member-id">
          <h4 class="member-name">${m.name}</h4>
          <div class="member-role">${m.role}</div>
        </div>
      </div>
      <p class="member-focus">${m.focus}</p>
      <div class="member-actions">
        <a class="m-btn m-btn-primary" href="mailto:contato@strategypartners.com.br?subject=Contato%20%E2%80%94%20${encodeURIComponent(m.name)}">
          Falar com
        </a>
        <button class="m-btn m-btn-ghost" data-talk="member:${m.id}">
          <span class="m-btn-dot"></span>Chat 24h
        </button>
      </div>
    </article>
  `).join('');
})();

// ============ Filter chips ============
(function chips() {
  const wrap = document.querySelector('.chips');
  if (!wrap) return;
  wrap.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    wrap.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
    b.classList.add('is-active');
    const tag = b.dataset.chip;
    document.querySelectorAll('.member').forEach(m => {
      const tags = (m.dataset.tags || '').split(' ');
      m.style.display = (tag === 'all' || tags.includes(tag)) ? '' : 'none';
    });
  });
})();

// ============ Chat modal ============
const modal = document.getElementById('chat-modal');
const chatThread = document.getElementById('chat-thread');
const chatForm = document.getElementById('chat-form');
const chatText = document.getElementById('chat-text');
const chatSend = document.getElementById('chat-send');
const chatSuggestions = document.getElementById('chat-suggestions');
const chatPortrait = document.getElementById('chat-portrait');
const chatRole = document.getElementById('chat-role');
const chatTitle = document.getElementById('chat-title');
const chatMeta = document.getElementById('chat-meta');

let currentPersona = null;
let chatHistory = [];

function openChat(key) {
  let persona;
  if (key.startsWith('member:')) {
    const id = key.split(':')[1];
    const m = window.SP_TEAM.find(x => x.id === id);
    if (!m) return;
    persona = {
      initials: m.initials,
      role: m.role,
      name: m.name,
      meta: `${m.focus} · São Paulo`,
      suggestions: window.SP_MEMBER_SUGGESTIONS(m),
      system: window.SP_MEMBER_SYSTEM(m),
      tone: m.tone
    };
  } else {
    persona = window.SP_LEADS[key];
  }
  if (!persona) return;

  currentPersona = persona;
  chatHistory = [];
  chatThread.innerHTML = '';

  chatPortrait.dataset.initials = persona.initials;
  chatPortrait.style.background = persona.tone === 'ink'
    ? 'linear-gradient(135deg,#354a87,#1e2d52)'
    : 'linear-gradient(135deg,#6478a8,#435ba1)';
  chatRole.textContent = persona.role;
  chatTitle.textContent = persona.name;
  chatMeta.textContent = persona.meta;

  // Opening message
  const opener = `Olá. Sou ${persona.name.split(' ')[0]}. Em que posso ajudar?`;
  appendBubble('them', opener);

  // Suggestions
  chatSuggestions.innerHTML = persona.suggestions.map(s =>
    `<button type="button" data-sugg="${s.replace(/"/g, '&quot;')}">${s}</button>`
  ).join('');

  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => chatText.focus(), 400);
}

function closeChat() {
  modal.setAttribute('aria-hidden', 'true');
  currentPersona = null;
  chatHistory = [];
}

function appendBubble(side, text) {
  const div = document.createElement('div');
  div.className = `bubble ${side}`;
  div.textContent = text;
  chatThread.appendChild(div);
  chatThread.scrollTop = chatThread.scrollHeight;
  return div;
}

function appendTyping() {
  const div = document.createElement('div');
  div.className = 'bubble them typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  chatThread.appendChild(div);
  chatThread.scrollTop = chatThread.scrollHeight;
  return div;
}

async function sendMessage(text) {
  if (!text.trim() || !currentPersona) return;
  appendBubble('me', text);
  chatHistory.push({ role: 'user', content: text });
  chatSuggestions.innerHTML = ''; // hide after first send
  chatText.value = '';
  chatText.style.height = 'auto';
  chatSend.disabled = true;

  const typing = appendTyping();

  try {
    const messages = [
      ...chatHistory
    ];
    const reply = await window.claude.complete({
      messages: [
        { role: 'user', content: `[SYSTEM]\n${currentPersona.system}\n\n[CONVERSA]` },
        ...messages
      ]
    });
    typing.remove();
    appendBubble('them', reply || '(sem resposta)');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    typing.remove();
    appendBubble('them', 'Desculpe — houve um problema na conexão. Por favor, escreva para contato@strategypartners.com.br para conversar diretamente.');
    console.error(err);
  } finally {
    chatSend.disabled = false;
    chatText.focus();
  }
}

// Wire openers
document.addEventListener('click', e => {
  const t = e.target.closest('[data-talk]');
  if (t) {
    e.preventDefault();
    openChat(t.dataset.talk);
    return;
  }
  const close = e.target.closest('[data-close]');
  if (close) {
    closeChat();
    return;
  }
  const sugg = e.target.closest('[data-sugg]');
  if (sugg) {
    sendMessage(sugg.dataset.sugg);
    return;
  }
});

chatForm?.addEventListener('submit', e => {
  e.preventDefault();
  sendMessage(chatText.value);
});

chatText?.addEventListener('input', () => {
  chatText.style.height = 'auto';
  chatText.style.height = Math.min(chatText.scrollHeight, 120) + 'px';
});

chatText?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeChat();
});

// ============ Language toggle (visual) ============
document.querySelector('.lang-toggle')?.addEventListener('click', () => {
  // visual-only — content swap could be wired later
  const t = document.querySelector('.lang-toggle');
  const active = t.querySelector('.lang-active');
  const inactive = t.querySelector('.lang-inactive');
  const a = active.textContent, b = inactive.textContent;
  active.textContent = b; inactive.textContent = a;
});

// ============ Tweaks ============
const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#435ba1",
  "theme": "white",
  "display": "instrument",
  "hero": "editorial"
}/*EDITMODE-END*/;

const ACCENTS = [
  { v: "#435ba1", label: "Marca (logo)" },
  { v: "#2B4A77", label: "Indigo" },
  { v: "#1e4976", label: "Azul petróleo" },
  { v: "#1F4D3A", label: "Verde-mata" },
  { v: "#6B1F2C", label: "Bordô" }
];

let TW = { ...TWEAKS_DEFAULTS };
function applyTweaks() {
  document.documentElement.style.setProperty('--accent', TW.accent);
  document.body.setAttribute('data-theme', TW.theme);
  document.body.setAttribute('data-display', TW.display);
  document.body.setAttribute('data-hero', TW.hero);
  // sync UI
  document.querySelectorAll('[data-tw="accent"] button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.v === TW.accent);
  });
  document.querySelectorAll('[data-tw="theme"] button, [data-tw="display"] button, [data-tw="hero"] button').forEach(b => {
    const key = b.parentElement.dataset.tw;
    b.classList.toggle('is-active', b.dataset.v === TW[key]);
  });
}

(function buildTweaks() {
  const tw = document.getElementById('tweaks');
  const swatchHost = tw.querySelector('[data-tw="accent"]');
  swatchHost.innerHTML = ACCENTS.map(a =>
    `<button data-v="${a.v}" style="background:${a.v}" title="${a.label}" aria-label="${a.label}"></button>`
  ).join('');

  tw.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const key = b.parentElement.dataset.tw;
    if (!key) return;
    TW[key] = b.dataset.v;
    applyTweaks();
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: b.dataset.v } }, '*');
  });

  document.getElementById('tweaks-close').addEventListener('click', () => {
    tw.hidden = true;
    window.parent?.postMessage({ type: '__edit_mode_dismissed' }, '*');
  });

  // Edit mode protocol — register listener FIRST
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '__activate_edit_mode') tw.hidden = false;
    if (d.type === '__deactivate_edit_mode') tw.hidden = true;
  });
  window.parent?.postMessage({ type: '__edit_mode_available' }, '*');

  applyTweaks();
})();
