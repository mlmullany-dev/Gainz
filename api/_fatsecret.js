// ───────────────────────────────────────────────────────────────
// Shared FatSecret helpers — SERVER-SIDE ONLY.
// This module reads the Client ID/Secret from environment variables
// and is never bundled into or reachable from the browser.
// Files in /api beginning with "_" are NOT exposed as routes by Vercel.
// ───────────────────────────────────────────────────────────────

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
// Base per the FatSecret Platform REST API (method-style endpoint).
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

// In-memory token cache. Persists across invocations on a warm serverless
// instance, so we reuse the token until ~60s before it expires.
let cachedToken = null; // { token: string, expiresAt: number(ms) }

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt) return cachedToken.token;

  const id = process.env.FATSECRET_CLIENT_ID;
  const secret = process.env.FATSECRET_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('Missing FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET env vars');
  }

  // OAuth 2.0 client_credentials grant — credentials sent as HTTP Basic auth.
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + ((data.expires_in || 86400) - 60) * 1000, // refresh 60s early
  };
  return cachedToken.token;
}

// Call a FatSecret REST method (e.g. 'foods.search', 'food.get.v4').
async function fatsecret(method, params = {}) {
  const token = await getAccessToken();
  const body = new URLSearchParams({ method, format: 'json', ...params }).toString();

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`FatSecret ${method} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  // FatSecret returns a 200 with an { error: {...} } body on API-level errors.
  if (json && json.error) {
    throw new Error(`FatSecret ${method} error: ${json.error.message || JSON.stringify(json.error)}`);
  }
  return json;
}

// ── helpers ──────────────────────────────────────────────────
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// Parse the compact "food_description" returned by foods.search, e.g.:
// "Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0.00g | Protein: 31.02g"
function parseDescription(desc) {
  if (!desc) return null;
  const serving = (desc.split(' - ')[0] || '').replace(/^Per\s+/i, '').trim();
  const cal = /Calories:\s*([\d.]+)kcal/i.exec(desc);
  const fat = /Fat:\s*([\d.]+)g/i.exec(desc);
  const carb = /Carbs:\s*([\d.]+)g/i.exec(desc);
  const pro = /Protein:\s*([\d.]+)g/i.exec(desc);
  return {
    serving,
    calories: cal ? num(cal[1]) : 0,
    fat: fat ? num(fat[1]) : 0,
    carbs: carb ? num(carb[1]) : 0,
    protein: pro ? num(pro[1]) : 0,
  };
}

// Normalize a FatSecret "serving" object into our clean shape.
function normalizeServing(s) {
  return {
    id: s.serving_id,
    description: s.serving_description,
    metricAmount: s.metric_serving_amount ? num(s.metric_serving_amount) : null,
    metricUnit: s.metric_serving_unit || null,
    calories: num(s.calories),
    protein: num(s.protein),
    carbs: num(s.carbohydrate),
    fat: num(s.fat),
  };
}

// Permissive-but-scoped CORS. If ALLOWED_ORIGIN is set (comma-separated),
// only those origins are allowed; otherwise the request origin is reflected.
function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGIN || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { fatsecret, parseDescription, normalizeServing, num, applyCors };
