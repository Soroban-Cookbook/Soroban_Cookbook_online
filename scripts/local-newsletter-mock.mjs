#!/usr/bin/env node
/**
 * local-newsletter-mock.mjs
 *
 * Lightweight local mock server for testing the newsletter signup endpoint
 * (POST JSON `{ "email": string }` -> 200 OK).
 *
 * Usage:
 *   node scripts/local-newsletter-mock.mjs
 *   PORT=9000 bun scripts/local-newsletter-mock.mjs
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 16 * 1024;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed. Use POST with JSON { "email": "..." }.' });
    return;
  }

  let body = '';
  let bodyBytes = 0;
  let aborted = false;

  req.on('data', (chunk) => {
    bodyBytes += chunk.length;
    if (bodyBytes > MAX_BODY_BYTES) {
      aborted = true;
      sendJson(res, 413, { error: 'Payload Too Large' });
      req.destroy();
      return;
    }
    body += chunk.toString('utf8');
  });

  req.on('end', () => {
    if (aborted) return;

    let parsed;
    try {
      parsed = JSON.parse(body || '{}');
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const email = typeof parsed?.email === 'string' ? parsed.email.trim() : '';
    if (!email) {
      sendJson(res, 400, { error: 'Missing required "email" string field' });
      return;
    }

    const csrfHeader = req.headers['x-csrf-token'] ? ' (CSRF header present)' : '';
    console.log(`[newsletter-mock] 200 OK — email="${email}"${csrfHeader}`);
    sendJson(res, 200, { ok: true, email });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[newsletter-mock] Listening on http://${HOST}:${PORT}`);
  console.log('[newsletter-mock] Accepts POST JSON { "email": "..." } and returns 200 OK');
});
