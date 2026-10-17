import { PRICE, CURRENCY, paypal, paypalReady, sameOrigin } from './_lib/paypal.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!paypalReady()) return res.status(501).json({ error: 'not_configured' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });
  try {
    const r = await paypal('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: CURRENCY, value: PRICE }, description: 'Chatlupe Report' }],
      application_context: { brand_name: 'Chatlupe', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
    });
    if (!r.ok || !r.data.id) {
      console.error('PayPal create order', r.status, JSON.stringify(r.data).slice(0, 500));
      return res.status(502).json({ error: 'paypal_error' });
    }
    return res.status(200).json({ id: r.data.id });
  } catch (e) {
    console.error('PayPal create order', e);
    return res.status(502).json({ error: 'paypal_error' });
  }
}
