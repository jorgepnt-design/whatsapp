const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (req.method === 'GET') return res.status(200).json({ configured: Boolean(key && to) });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!key || !to) return res.status(501).json({ error: 'not_configured' });
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'forbidden' });
    } catch { return res.status(403).json({ error: 'forbidden' }); }
  }
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  // Honeypot field: real visitors never fill it in.
  if (str(body.website, 200)) return res.status(200).json({ ok: true });
  const name = str(body.name, 100);
  const email = str(body.email, 200);
  const message = str(body.message, 5000);
  if (message.length < 5) return res.status(400).json({ error: 'message_missing' });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'rate_limited' });

  const text = `Neue Nachricht über das Chatlupe-Kontaktformular\n\nName: ${name || '–'}\nE-Mail: ${email || '–'}\n\n${message}\n`;
  let r;
  try {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'Chatlupe <onboarding@resend.dev>',
        to: [to],
        subject: `Chatlupe Kontakt${name ? ': ' + name.replace(/[\r\n]+/g, ' ') : ''}`,
        text,
        ...(email ? { reply_to: email } : {}),
      }),
    });
  } catch (e) {
    console.error('Resend', e);
    return res.status(502).json({ error: 'send_failed' });
  }
  if (!r.ok) {
    console.error('Resend', r.status, (await r.text().catch(() => '')).slice(0, 300));
    return res.status(502).json({ error: 'send_failed' });
  }
  return res.status(200).json({ ok: true });
}
