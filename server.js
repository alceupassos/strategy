/**
 * Static site + POST /api/chat → OpenAI (modelo por defeito: gpt-5.4-nano).
 * Ex.: OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-5.4-nano node server.js
 * Requer Node 18+ (fetch nativo).
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

(function loadDotEnv() {
  function applyFile(envPath, overrideExisting) {
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!k) continue;
      if (overrideExisting || process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  }
  try {
    applyFile(path.join(__dirname, '.env'), false);
    applyFile(path.join(__dirname, '.env.local'), true);
  } catch (e) {
    console.warn('.env não carregado:', e.message);
  }
})();

// Typo comum em .env: OPENA_API_KEY sem o segundo "I"
if (!process.env.OPENAI_API_KEY && process.env.OPENA_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPENA_API_KEY;
}

const root = __dirname;
const port = Number.parseInt(process.env.PORT || '3026', 10);
const hostname = process.env.HOSTNAME || '127.0.0.1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-nano';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function send(req, res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function callOpenAIChat(system, messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY em falta');
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [{ role: 'system', content: system }, ...messages],
    max_completion_tokens: 2048,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.error?.code || JSON.stringify(data);
    throw new Error(msg || `OpenAI HTTP ${res.status}`);
  }

  const reply = data.choices?.[0]?.message?.content;
  if (typeof reply === 'string' && reply.trim()) {
    return reply.trim();
  }
  // Alguns modelos expõem texto noutros campos
  const alt = data.choices?.[0]?.message;
  if (alt && typeof alt === 'object') {
    const s = alt.content ?? alt.text;
    if (typeof s === 'string' && s.trim()) return s.trim();
  }
  throw new Error('Resposta vazia do modelo');
}

/** Conteúdo multimodal só em mensagens user (text + image_url data URLs). */
function normalizeChatMessage(m) {
  if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;

  if (typeof m.content === 'string') {
    const s = m.content.trim();
    if (!s) return null;
    return { role: m.role, content: m.content };
  }

  if (!Array.isArray(m.content)) return null;
  if (m.role === 'assistant') return null;

  const parts = [];
  for (const p of m.content) {
    if (!p || typeof p !== 'object') continue;
    if (p.type === 'text' && typeof p.text === 'string') {
      const t = p.text.trim();
      if (t) parts.push({ type: 'text', text: t.slice(0, 200000) });
    }
    if (p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string') {
      const url = p.image_url.url;
      if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)) continue;
      if (url.length > 22_000_000) continue;
      parts.push({ type: 'image_url', image_url: { url } });
    }
  }
  if (!parts.length) return null;
  return { role: 'user', content: parts };
}

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root + path.sep)) {
    return null;
  }

  return filePath;
}

const server = http.createServer(async (req, res) => {
  const pathname = req.url ? new URL(req.url, `http://localhost`).pathname : '';

  if (req.method === 'POST' && pathname === '/api/chat') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!process.env.OPENAI_API_KEY) {
      send(req, res, 503, JSON.stringify({
        error: 'Chat não configurado. Defina OPENAI_API_KEY no ambiente do servidor.',
      }));
      return;
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      send(req, res, 400, JSON.stringify({ error: 'JSON inválido.' }));
      return;
    }
    if (typeof body.system !== 'string' || !Array.isArray(body.messages)) {
      send(req, res, 400, JSON.stringify({ error: 'Esperado { system: string, messages: [{role,content}] }.' }));
      return;
    }
    const clean = body.messages.map(normalizeChatMessage).filter(Boolean);
    if (!clean.length) {
      send(req, res, 400, JSON.stringify({ error: 'messages deve incluir pelo menos uma mensagem user/assistant válida.' }));
      return;
    }
    try {
      const reply = await callOpenAIChat(body.system, clean);
      send(req, res, 200, JSON.stringify({ reply }));
    } catch (e) {
      console.error('[api/chat]', e.message);
      send(req, res, 502, JSON.stringify({
        error: e.message || 'Falha ao contactar o modelo.',
      }));
    }
    return;
  }

  if (!req.url || !['GET', 'HEAD'].includes(req.method)) {
    send(req, res, 405, '');
    return;
  }

  const filePath = resolvePath(req.url);

  if (!filePath) {
    send(req, res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (path.extname(filePath)) {
        send(req, res, 404, 'Not found');
        return;
      }

      fs.readFile(path.join(root, 'index.html'), (fallbackError, fallbackData) => {
        if (fallbackError) {
          send(req, res, 500, 'Server error');
          return;
        }

        send(req, res, 200, fallbackData, { 'Content-Type': contentTypes['.html'] });
      });
      return;
    }

    send(req, res, 200, data, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    });
  });
});

server.listen(port, hostname, () => {
  console.log(`strategy server on ${hostname}:${port} (chat model: ${DEFAULT_MODEL})`);
});
