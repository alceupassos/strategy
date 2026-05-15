// Strategy Partners — interactions

// ============ Hero slideshow (20s) ============
(function heroSlideshow() {
  const slides = [...document.querySelectorAll('.hero-banner__slide')];
  const dots = [...document.querySelectorAll('.hero-banner__dot')];
  if (!slides.length) return;

  const INTERVAL_MS = 20000;
  let index = slides.findIndex(s => s.classList.contains('is-active'));
  if (index < 0) index = 0;
  let timer;

  function setSlide(next) {
    slides[index].classList.remove('is-active');
    if (dots[index]) {
      dots[index].classList.remove('is-active');
      dots[index].setAttribute('aria-selected', 'false');
    }
    index = (next + slides.length) % slides.length;
    slides[index].classList.add('is-active');
    if (dots[index]) {
      dots[index].classList.add('is-active');
      dots[index].setAttribute('aria-selected', 'true');
    }
  }

  function schedule() {
    clearInterval(timer);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    timer = setInterval(() => setSlide(index + 1), INTERVAL_MS);
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const goto = Number(dot.dataset.goto);
      if (Number.isNaN(goto) || goto === index) return;
      setSlide(goto);
      schedule();
    });
  });

  schedule();
})();

// ============ Render cases ============
(function renderCases() {
  const root = document.querySelector('[data-cases]');
  if (!root) return;
  root.innerHTML = window.SP_CASES.map((c, i) => `
    <li class="case" data-case="${i}">
      <div class="case-index">
        <span class="case-n">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="case-headline">
        <h3 class="case-archetype">${c.archetype}</h3>
        <p class="case-desc">${c.desc}</p>
        <p class="case-value">${c.value}</p>
        ${c.mandate ? `<p class="case-mandate">${c.mandate}</p>` : ''}
      </div>
      ${c.sector ? `<div class="case-sector">${c.sector}</div>` : '<div class="case-sector" aria-hidden="true"></div>'}
      <div class="case-arrow">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </li>
  `).join('');
  root.addEventListener('click', e => {
    const li = e.target.closest('.case');
    if (!li) return;
    li.classList.toggle('is-open');
  });
})();

// ============ Markdown (light) for specialties modal ============
function escapeHtmlMd(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function inlineMd(s) {
  let t = escapeHtmlMd(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  try {
    t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  } catch (e) {
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const href = /^https?:\/\//i.test(url) ? url : '#';
    return `<a href="${escapeHtmlMd(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  return t;
}
function mdToHtml(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let listKind = null;
  const closeList = () => {
    if (listKind) {
      out.push(listKind === 'ul' ? '</ul>' : '</ol>');
      listKind = null;
    }
  };
  const para = [];
  const flushPara = () => {
    if (para.length) {
      out.push('<p>' + inlineMd(para.join(' ')) + '</p>');
      para.length = 0;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const t = line.trim();
    if (!t) {
      closeList();
      flushPara();
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      flushPara();
      const n = h[1].length;
      out.push(`<h${n}>${inlineMd(h[2])}</h${n}>`);
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      flushPara();
      if (listKind !== 'ul') {
        closeList();
        out.push('<ul>');
        listKind = 'ul';
      }
      out.push('<li>' + inlineMd(t.replace(/^[-*]\s+/, '')) + '</li>');
      continue;
    }
    const ol = t.match(/^(\d+)\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (listKind !== 'ol') {
        closeList();
        out.push('<ol>');
        listKind = 'ol';
      }
      out.push('<li>' + inlineMd(ol[2]) + '</li>');
      continue;
    }
    if (/^---+$/.test(t)) {
      closeList();
      flushPara();
      out.push('<hr>');
      continue;
    }
    closeList();
    para.push(t);
  }
  closeList();
  flushPara();
  return out.join('\n');
}

// ============ Render team ============
(function renderTeam() {
  const root = document.querySelector('[data-team]');
  if (!root) return;
  root.innerHTML = window.SP_TEAM.map(m => `
    <article class="lead-card member" data-member-id="${m.id}" data-tags="${m.tags.join(' ')}">
      <div class="lead-portrait lead-portrait--photo lead-portrait--cyborg">
        <img src="${m.photo}" alt="${window.SP_AGENTIC_LABEL(m.agenticNum)}" width="160" height="200" loading="lazy" />
      </div>
      <div class="lead-body">
        <div class="lead-eyebrow">${m.role} · ${m.focus}</div>
        <h3 class="lead-name">${m.name}</h3>
        <p class="lead-bio">Agente especializado em ${m.focus.toLowerCase()} — integrado ao processo decisório da firma.</p>
        <ul class="lead-tags">${(m.badges || [m.focus]).map(b => `<li>${b}</li>`).join('')}</ul>
        <div class="member-actions">
          ${m.specialtiesMd ? `<button type="button" class="m-btn m-btn-primary" data-specialties="${m.specialtiesMd}" data-specialties-label="${String(m.focus).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" aria-label="Especialidades — ${window.SP_AGENTIC_LABEL(m.agenticNum)}">
            Especialidades
          </button>` : `<a class="m-btn m-btn-primary" href="mailto:contato@strategypartners.com.br?subject=Contato%20%E2%80%94%20${encodeURIComponent(m.name)}">
            Falar com
          </a>`}
          <button type="button" class="m-btn m-btn-ghost" data-talk="member:${m.id}">
            <span class="m-btn-dot"></span>Chat 24h
          </button>
        </div>
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

const chatAttachChips = document.getElementById('chat-attach-chips');
const chatClip = document.getElementById('chat-clip');
const chatFile = document.getElementById('chat-file');
const chatAttachPick = document.getElementById('chat-attach-pick');

const MAX_TABULAR_CHARS = 14000;
const MAX_EXCEL_ROWS = 350;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
let pendingAttachments = [];
let attachIdSeq = 0;

function escapeChip(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function setAttachPopover(open) {
  const pop = document.getElementById('chat-attach-popover');
  if (!pop || !chatClip) return;
  pop.hidden = !open;
  chatClip.classList.toggle('is-open', !!open);
  chatClip.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function renderAttachChips() {
  if (!chatAttachChips) return;
  if (!pendingAttachments.length) {
    chatAttachChips.innerHTML = '';
    chatAttachChips.hidden = true;
    return;
  }
  chatAttachChips.hidden = false;
  chatAttachChips.innerHTML = pendingAttachments
    .map(
      (a) =>
        `<span class="chat-attach-chip"><span title="${escapeChip(a.name)}">${escapeChip(
          a.name
        )}</span><button type="button" data-rm="${a.id}" aria-label="Remover anexo">×</button></span>`
    )
    .join('');
  chatAttachChips.querySelectorAll('[data-rm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.rm);
      pendingAttachments = pendingAttachments.filter((x) => x.id !== id);
      renderAttachChips();
    });
  });
}

function resetChatAttachments() {
  pendingAttachments = [];
  renderAttachChips();
  if (chatFile) chatFile.value = '';
  setAttachPopover(false);
}

function resetAttachmentSession() {
  attachIdSeq = 0;
  resetChatAttachments();
}

function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(new Error('Falha ao ler o ficheiro.'));
    r.readAsDataURL(file);
  });
}

function truncateTabular(s, max) {
  if (!s || s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[… recorte por limite de tamanho …]`;
}

async function fileToAttachment(file) {
  const name = file.name || 'anexo';
  const mime = file.type || '';
  if (mime.startsWith('image/')) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Imagem demasiado grande (máx. ~4 MB).');
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(dataUrl)) {
      throw new Error('Formato de imagem não suportado (use PNG, JPEG ou WebP).');
    }
    return { id: ++attachIdSeq, kind: 'image', name, dataUrl };
  }
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    if (typeof window.XLSX === 'undefined' || !window.XLSX.read) {
      throw new Error('Biblioteca Excel não carregou. Verifique a rede ou recarregue a página.');
    }
    const ab = await file.arrayBuffer();
    const wb = window.XLSX.read(ab, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('Folha Excel vazia.');
    const sheet = wb.Sheets[sheetName];
    const aoa = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const slice = aoa.slice(0, MAX_EXCEL_ROWS);
    const tsv = slice.map((row) => row.map((c) => String(c)).join('\t')).join('\n');
    return {
      id: ++attachIdSeq,
      kind: 'tabular',
      name: `${name} [${sheetName}]`,
      text: truncateTabular(tsv, MAX_TABULAR_CHARS),
    };
  }
  const text = await file.text();
  return { id: ++attachIdSeq, kind: 'tabular', name, text: truncateTabular(text, MAX_TABULAR_CHARS) };
}

function buildAttachmentContextBlock() {
  const blocks = pendingAttachments.filter((a) => a.kind === 'tabular');
  if (!blocks.length) return '';
  let out = '\n\n--- Dados anexados ---\n';
  for (const b of blocks) {
    out += `\n## ${b.name}\n${b.text}\n`;
  }
  return out;
}

function buildUserMessageForHistory(textTrim) {
  const attachBlock = buildAttachmentContextBlock();
  const base = (textTrim || '(ver anexos)') + attachBlock;
  const imgs = pendingAttachments.filter((a) => a.kind === 'image');
  if (imgs.length) {
    const parts = [
      {
        type: 'text',
        text:
          '[Imagens anexadas — interpretação por OCR: extraia tabelas e números. Se não for fiável, peça CSV ou Excel.]\n\n' +
          base,
      },
    ];
    for (const im of imgs) {
      parts.push({ type: 'image_url', image_url: { url: im.dataUrl } });
    }
    return { content: parts };
  }
  return { content: base };
}

function formatMeDisplay(textTrim) {
  const names = pendingAttachments.map((a) => a.name);
  const head = textTrim || (names.length ? '…' : '');
  if (!names.length) return head;
  return `${head}\n\n[Anexos: ${names.join(', ')}]`;
}

const CHART_JSON_RE = /```chart-json\s*([\s\S]*?)```/gi;

function stripChartJsonFences(raw) {
  return raw.replace(CHART_JSON_RE, '').trim();
}

function parseChartJsonSpecs(raw) {
  const specs = [];
  CHART_JSON_RE.lastIndex = 0;
  let m;
  while ((m = CHART_JSON_RE.exec(raw)) !== null) {
    try {
      const spec = JSON.parse(m[1].trim());
      if (spec && typeof spec === 'object') specs.push(spec);
    } catch {
      /* ignorar bloco inválido */
    }
  }
  return specs;
}

function sanitizeNums(arr, maxLen) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxLen).map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });
}

function renderPlotlyIn(el, spec) {
  if (typeof window.Plotly === 'undefined' || !window.Plotly.newPlot) {
    el.innerHTML =
      '<div class="chat-chart-err">Plotly não carregou (rede ou bloqueio de script). Recarregue a página.</div>';
    return;
  }
  const MAX = 500;
  const layout = {
    title: String(spec.title || '').slice(0, 200),
    margin: { t: 52, r: 20, b: 52, l: 56 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(0,0,0,0.02)',
    xaxis: { title: String(spec.xLabel || ''), gridcolor: 'rgba(0,0,0,0.06)' },
    yaxis: { title: String(spec.yLabel || ''), gridcolor: 'rgba(0,0,0,0.06)' },
  };
  let traces = [];
  try {
    if (spec.type === 'candlestick' && Array.isArray(spec.x) && Array.isArray(spec.close)) {
      const x = spec.x.slice(0, MAX);
      const L = x.length;
      traces = [
        {
          type: 'candlestick',
          x,
          open: sanitizeNums(spec.open, L),
          high: sanitizeNums(spec.high, L),
          low: sanitizeNums(spec.low, L),
          close: sanitizeNums(spec.close, L),
          increasing: { line: { color: '#2a9d5c' } },
          decreasing: { line: { color: '#c94c4c' } },
        },
      ];
    } else {
      const chartType = spec.type === 'bar' ? 'bar' : 'scatter';
      const xSrc = Array.isArray(spec.x) ? spec.x.slice(0, MAX) : [];
      const mode = chartType === 'bar' ? undefined : spec.type === 'scatter' ? 'markers' : 'lines';
      if (Array.isArray(spec.series)) {
        for (const s of spec.series) {
          if (!s || typeof s !== 'object') continue;
          const yRaw = sanitizeNums(s.y, MAX);
          const len = Math.min(xSrc.length || yRaw.length, yRaw.length);
          const x = xSrc.length ? xSrc.slice(0, len) : [...Array(len).keys()];
          const y = yRaw.slice(0, len);
          traces.push({
            type: chartType,
            mode,
            name: String(s.name || 'Série').slice(0, 120),
            x,
            y,
          });
        }
      }
      if (Array.isArray(spec.traces)) {
        for (const t of spec.traces) {
          if (t && typeof t === 'object') traces.push(t);
        }
      }
    }
    if (!traces.length) throw new Error('Sem séries');
    window.Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: true });
  } catch (e) {
    el.innerHTML = '<div class="chat-chart-err">Não foi possível desenhar o gráfico a partir do JSON.</div>';
    console.warn(e);
  }
}

function appendAssistantBubble(rawReply) {
  const specs = parseChartJsonSpecs(rawReply);
  const prose = stripChartJsonFences(rawReply);

  const wrap = document.createElement('div');
  wrap.className = 'bubble them';

  if (prose) {
    const md = document.createElement('div');
    md.className = 'bubble-md';
    md.innerHTML = mdToHtml(prose);
    wrap.appendChild(md);
  }

  for (const spec of specs) {
    const host = document.createElement('div');
    host.className = 'chat-chart-host';
    wrap.appendChild(host);
    renderPlotlyIn(host, spec);
  }

  if (!wrap.childNodes.length) {
    wrap.textContent = rawReply || '(sem resposta)';
  }

  chatThread.appendChild(wrap);
  chatThread.scrollTop = chatThread.scrollHeight;
}

const specModal = document.getElementById('specialties-modal');
const specContent = document.getElementById('specialties-content');
const specTitle = document.getElementById('specialties-title');
const specLoading = document.getElementById('specialties-loading');

let currentPersona = null;
let chatHistory = [];

function closeSpecialties() {
  specModal?.setAttribute('aria-hidden', 'true');
}

async function openSpecialties(file, label) {
  if (!specModal || !specContent || !file) return;
  closeChat();
  specTitle.textContent = 'Especialidades — ' + (label || '');
  specContent.innerHTML = '';
  if (specLoading) specLoading.hidden = false;
  specModal.setAttribute('aria-hidden', 'false');
  const safe = file.replace(/^\.\//, '').replace(/^modal\//, '');
  const url = `./modal/${encodeURIComponent(safe)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const md = await r.text();
    specContent.innerHTML = mdToHtml(md);
  } catch (e) {
    specContent.innerHTML = '<p class="md-error">Não foi possível carregar o conteúdo.</p>';
    console.error(e);
  } finally {
    if (specLoading) specLoading.hidden = true;
  }
}

async function openChat(key) {
  let persona;
  if (key.startsWith('member:')) {
    const id = key.split(':')[1];
    const m = window.SP_TEAM.find(x => x.id === id);
    if (!m) return;
    let skillBody = '';
    const mainFile = m.specialtiesMd ? m.specialtiesMd.replace(/^\.\//, '') : '';
    const extras = Array.isArray(m.extraSkills)
      ? m.extraSkills.map((rel) => String(rel).replace(/^\.\//, '').trim()).filter(Boolean)
      : [];
    try {
      const mainPromise = mainFile
        ? fetch(`./skills/skill-${encodeURIComponent(mainFile)}`).then((r) => (r.ok ? r.text() : ''))
        : Promise.resolve('');
      const extraPromises = extras.map((name) =>
        fetch(`./skills/${encodeURIComponent(name)}`)
          .then((r) => (r.ok ? r.text() : ''))
          .then((text) => ({ name, text }))
      );
      const bundled = await Promise.all([mainPromise, ...extraPromises]);
      const mainText = bundled[0];
      const extraResults = bundled.slice(1);
      for (const { name, text } of extraResults) {
        if (text) {
          skillBody += (skillBody ? '\n\n' : '') + `--- Suplemento: ${name} ---\n\n${text}`;
        }
      }
      if (mainText) {
        skillBody += (skillBody ? '\n\n' : '') + mainText;
      }
    } catch (e) {
      console.error(e);
    }
    persona = {
      initials: m.initials,
      role: m.role,
      name: m.name,
      chatGreetingName: window.SP_AGENTIC_LABEL(m.agenticNum),
      specialtyIntro: m.specialtyIntro || '',
      photo: m.photo,
      meta: `${m.focus} · São Paulo`,
      suggestions: window.SP_MEMBER_SUGGESTIONS(m),
      system: window.SP_MEMBER_SYSTEM(m, skillBody),
      tone: m.tone,
      memberSkillBound: true
    };
  } else {
    persona = window.SP_LEADS[key];
  }
  if (!persona) return;
  persona = {
    ...persona,
    system:
      (persona.system || '') +
      (window.SP_LLM_DISCLOSURE_RULE || '') +
      (window.SP_DATA_VIZ_AND_ATTACH_RULE || ''),
  };

  currentPersona = persona;
  chatHistory = [];
  chatThread.innerHTML = '';
  resetAttachmentSession();

  chatPortrait.dataset.initials = persona.initials;
  if (persona.photo) {
    chatPortrait.classList.add('has-photo');
    chatPortrait.style.backgroundImage = `url('${persona.photo}')`;
    chatPortrait.style.backgroundSize = 'cover';
    chatPortrait.style.backgroundPosition = 'center 20%';
    chatPortrait.style.backgroundColor = '#e8ecf4';
  } else {
    chatPortrait.classList.remove('has-photo');
    chatPortrait.style.backgroundImage = '';
    chatPortrait.style.backgroundSize = '';
    chatPortrait.style.backgroundPosition = '';
    chatPortrait.style.background = persona.tone === 'ink'
      ? 'linear-gradient(135deg,#354a87,#1e2d52)'
      : 'linear-gradient(135deg,#6478a8,#435ba1)';
  }
  chatRole.textContent = persona.role;
  chatTitle.textContent = persona.name;
  chatMeta.textContent = persona.phone
    ? `${persona.meta} · ${persona.phone}`
    : persona.meta;

  // Opening message (welcome + Strategy AGI Partners 2030, sempre simpático)
  const who = persona.chatGreetingName || persona.name.split(/\s+/)[0];
  const opener =
    typeof window.SP_buildChatOpener === 'function'
      ? window.SP_buildChatOpener(who, persona.specialtyIntro)
      : `Olá. Sou ${who}. Em que posso ajudar?`;
  appendBubble('them', opener);
  chatHistory.push({ role: 'assistant', content: opener });

  // Suggestions
  chatSuggestions.innerHTML = persona.suggestions.map(s =>
    `<button type="button" data-sugg="${s.replace(/"/g, '&quot;')}">${s}</button>`
  ).join('');

  closeSpecialties();
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => chatText.focus(), 400);
}

function closeChat() {
  modal.setAttribute('aria-hidden', 'true');
  currentPersona = null;
  chatHistory = [];
  resetChatAttachments();
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

async function completeChat({ system, messages }) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  });
  const raw = await r.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!r.ok) {
    throw new Error(data.error || (raw && raw.length < 400 ? raw.trim() : '') || `Erro HTTP ${r.status}`);
  }
  return typeof data.reply === 'string' ? data.reply : '';
}

async function sendMessage(overrideText) {
  const typed = overrideText !== undefined ? String(overrideText) : chatText.value;
  const textTrim = typed.trim();
  if (!currentPersona) return;
  if (!textTrim && !pendingAttachments.length) return;

  const displayLines = formatMeDisplay(textTrim);
  const userPayload = buildUserMessageForHistory(textTrim);
  appendBubble('me', displayLines);
  chatHistory.push({ role: 'user', ...userPayload });
  resetChatAttachments();

  chatSuggestions.innerHTML = '';
  chatText.value = '';
  chatText.style.height = 'auto';
  chatSend.disabled = true;

  const typing = appendTyping();

  try {
    const replyRaw = await completeChat({
      system: currentPersona.system,
      messages: chatHistory,
    });
    typing.remove();
    const needle = window.SP_MEMBER_OFF_TOPIC_REPLY;
    let reply = (replyRaw || '').trim();
    if (currentPersona.memberSkillBound && needle && reply.includes(needle)) {
      reply = needle;
    }
    appendAssistantBubble(reply || '(sem resposta)');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    typing.remove();
    const m = String(err.message || '');
    const isConfig = /não configurado|OPENAI_API_KEY/i.test(m);
    const isQuota =
      /quota|billing|exceeded your current|insufficient_quota|rate limit|429/i.test(m);
    let userMsg;
    if (isConfig) {
      userMsg =
        'O assistente ainda não está configurado neste servidor (OPENAI_API_KEY). Escreva para contato@strategypartners.com.br.';
    } else if (isQuota) {
      userMsg =
        'O serviço de IA está temporariamente indisponível (limite ou faturação na conta OpenAI). Tente mais tarde ou escreva para contato@strategypartners.com.br.';
    } else if (/Erro HTTP 502|502/.test(m) && !/openai|quota/i.test(m)) {
      userMsg =
        'Não foi possível contactar o assistente (erro no servidor ou na rede). Se persistir, escreva para contato@strategypartners.com.br.';
    } else {
      userMsg =
        `Não foi possível concluir a resposta: ${m.slice(0, 280)}${m.length > 280 ? '…' : ''} — em caso de dúvida, contato@strategypartners.com.br`;
    }
    appendBubble('them', userMsg);
    console.error(err);
  } finally {
    chatSend.disabled = false;
    chatText.focus();
  }
}

// Wire openers
document.addEventListener('click', e => {
  const sp = e.target.closest('[data-specialties]');
  if (sp) {
    e.preventDefault();
    openSpecialties(sp.dataset.specialties, sp.dataset.specialtiesLabel || '');
    return;
  }
  const t = e.target.closest('[data-talk]');
  if (t) {
    e.preventDefault();
    void openChat(t.dataset.talk);
    return;
  }
  const close = e.target.closest('[data-close]');
  if (close) {
    closeChat();
    return;
  }
  const closeSp = e.target.closest('[data-close-specialties]');
  if (closeSp) {
    closeSpecialties();
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

chatClip?.addEventListener('click', (e) => {
  e.stopPropagation();
  const pop = document.getElementById('chat-attach-popover');
  setAttachPopover(pop?.hidden !== false);
});

chatAttachPick?.addEventListener('click', (e) => {
  e.stopPropagation();
  chatFile?.click();
  setAttachPopover(false);
});

chatFile?.addEventListener('change', async () => {
  const files = [...(chatFile?.files || [])];
  for (const f of files) {
    try {
      pendingAttachments.push(await fileToAttachment(f));
    } catch (err) {
      alert(String(err.message || err));
    }
  }
  if (chatFile) chatFile.value = '';
  renderAttachChips();
});

document.addEventListener('click', (e) => {
  const pop = document.getElementById('chat-attach-popover');
  if (!pop || pop.hidden || !chatClip) return;
  if (chatClip.contains(e.target) || pop.contains(e.target)) return;
  setAttachPopover(false);
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const pop = document.getElementById('chat-attach-popover');
  if (pop && !pop.hidden && modal.getAttribute('aria-hidden') === 'false') {
    setAttachPopover(false);
    return;
  }
  if (modal.getAttribute('aria-hidden') === 'false') closeChat();
  else if (specModal?.getAttribute('aria-hidden') === 'false') closeSpecialties();
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
