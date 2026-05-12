const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const port = Number.parseInt(process.env.PORT || '3026', 10);
const hostname = process.env.HOSTNAME || '127.0.0.1';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root + path.sep)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((req, res) => {
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
  console.log(`strategy static server listening on ${hostname}:${port}`);
});
