import { paywallOn, verifyToken } from './_lib/paypal.js';

export const config = { maxDuration: 60 };

const MAX_PROMPT = 120000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') {
    return res.status(200).json({ configured: Boolean(key), paywall: paywallOn() });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!key) return res.status(501).json({ error: 'not_configured' });
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'forbidden' });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  if (paywallOn() && !verifyToken(body.token)) return res.status(402).json({ error: 'payment_required' });
  const prompt = body.prompt;
  if (typeof prompt !== 'string' || !prompt.startsWith('Du bist Chatlupe')) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: 'prompt_too_large' });
  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    });
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
  if (upstream.status === 429) return res.status(429).json({ error: 'rate_limited' });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('Anthropic API', upstream.status, detail.slice(0, 500));
    return res.status(502).json({ error: 'upstream_error' });
  }
  const data = await upstream.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  const parsed = extractJson(text);
  if (!parsed || !parsed.titel || !Array.isArray(parsed.kapitel)) return res.status(502).json({ error: 'invalid_json' });
  return res.status(200).json(parsed);
}
