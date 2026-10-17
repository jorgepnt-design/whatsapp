import { PRICE, CURRENCY, paywallOn, paypalReady } from './_lib/paypal.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    enabled: paywallOn(),
    ready: paypalReady(),
    clientId: process.env.PAYPAL_CLIENT_ID || null,
    price: PRICE,
    currency: CURRENCY,
  });
}
