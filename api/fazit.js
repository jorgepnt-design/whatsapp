import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 120 };

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

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
    return res.status(200).json({ configured: Boolean(key) });
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
  const prompt = body.prompt;
  if (typeof prompt !== 'string' || !prompt.startsWith('Du bist Chatlupe')) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: 'prompt_too_large' });
  const client = new Anthropic({ apiKey: key, timeout: 110_000, maxRetries: 1 });
  let message;
  try {
    // Streaming keeps the long article from hitting HTTP timeouts; the server-side
    // fallback re-runs the request on another model if this one declines it.
    message = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: prompt }],
    }).finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'rate_limited' });
    if (e instanceof Anthropic.APIError) console.error('Anthropic API', e.status, String(e.message).slice(0, 500));
    else console.error('Anthropic API', e);
    return res.status(502).json({ error: 'upstream_error' });
  }
  if (message.stop_reason === 'refusal') return res.status(422).json({ error: 'refused' });
  const text = message.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
  const parsed = extractJson(text);
  if (!parsed || !parsed.titel || !Array.isArray(parsed.kapitel)) return res.status(502).json({ error: 'invalid_json' });
  return res.status(200).json(parsed);
}
