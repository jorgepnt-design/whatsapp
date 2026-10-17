import crypto from 'node:crypto';

export const PRICE = process.env.REPORT_PRICE || '14.99';
export const CURRENCY = process.env.REPORT_CURRENCY || 'EUR';
const TOKEN_TTL_MS = 3 * 60 * 60 * 1000;
const CAPTURE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const apiBase = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
const secret = () => process.env.PAYWALL_SECRET || process.env.PAYPAL_CLIENT_SECRET || '';

export const paywallOn = () => process.env.PAYWALL_DISABLED !== '1';
export const paypalReady = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export function readBody(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body || {};
}

async function accessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(apiBase() + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('paypal_auth ' + r.status);
  return (await r.json()).access_token;
}

export async function paypal(method, path, body) {
  const token = await accessToken();
  const r = await fetch(apiBase() + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

// A completed capture for the expected amount, captured within the last 24 hours.
export function paidCapture(order) {
  if (!order || order.status !== 'COMPLETED') return null;
  const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap || cap.status !== 'COMPLETED') return null;
  if (cap.amount?.value !== PRICE || cap.amount?.currency_code !== CURRENCY) return null;
  const at = Date.parse(cap.create_time || '');
  if (!at || Date.now() - at > CAPTURE_MAX_AGE_MS) return null;
  return cap;
}

const hmacKey = () => crypto.createHash('sha256').update('chatlupe-paywall:' + secret()).digest();

export function signToken(orderId) {
  const payload = Buffer.from(JSON.stringify({ oid: orderId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', hmacKey()).update(payload).digest('base64url');
  return payload + '.' + sig;
}

export function verifyToken(token) {
  if (!secret() || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', hmacKey()).update(payload).digest('base64url'));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
