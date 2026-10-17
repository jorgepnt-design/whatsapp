import { paypal, paypalReady, sameOrigin, readBody, paidCapture, signToken } from './_lib/paypal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!paypalReady()) return res.status(501).json({ error: 'not_configured' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  const orderID = readBody(req).orderID;
  if (typeof orderID !== 'string' || !/^[A-Z0-9]{10,40}$/.test(orderID)) return res.status(400).json({ error: 'invalid_request' });
  try {
    let r = await paypal('POST', `/v2/checkout/orders/${orderID}/capture`);
    // A retried request after a successful capture: check the order itself.
    if (!r.ok) r = await paypal('GET', `/v2/checkout/orders/${orderID}`);
    if (!paidCapture(r.data)) {
      console.error('PayPal capture', r.status, JSON.stringify(r.data).slice(0, 500));
      return res.status(402).json({ error: 'payment_failed' });
    }
    return res.status(200).json({ token: signToken(orderID) });
  } catch (e) {
    console.error('PayPal capture', e);
    return res.status(502).json({ error: 'paypal_error' });
  }
}
