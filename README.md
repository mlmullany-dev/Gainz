# Gainz

A single-file fitness PWA (`index.html`) — workout tracking, programs, daily log,
benchmarks, and a macro calculator. Auth + data via Firebase (client SDK).

## FatSecret food lookup (server-side proxy)

Food search uses the **FatSecret Platform API**. Because the FatSecret Client
Secret must never reach the browser, all calls go through serverless proxy
functions in `/api`, deployed on **Vercel**. The frontend only ever calls the
proxy (`/api/...`), never FatSecret directly.

### Endpoints
- `GET /api/foods-search?q=<term>&page=<n>` — clean list of foods (name, brand, summary macros)
- `GET /api/food?id=<food_id>` — full serving + macro data for one food

Both share `api/_fatsecret.js`, which fetches an OAuth 2.0 `client_credentials`
token (HTTP Basic auth, `scope=basic`) from `oauth.fatsecret.com/connect/token`
and **caches it in memory** until ~60s before it expires.

### Setup
1. Create FatSecret API credentials at <https://platform.fatsecret.com/>.
2. In the FatSecret dashboard, **disable IP restriction** (serverless egress IPs
   are dynamic) — rely on OAuth2 scopes instead.
3. Connect this GitHub repo to Vercel.
4. In Vercel → Project → Settings → **Environment Variables**, set:
   - `FATSECRET_CLIENT_ID`
   - `FATSECRET_CLIENT_SECRET`
   - (optional) `ALLOWED_ORIGIN` — restrict the proxy to your domain
5. Deploy. Add your `*.vercel.app` domain to Firebase → Authentication →
   Authorized domains.

See `.env.example` for the variable names. Real values live only in Vercel — never in the repo.

> If the proxy isn't reachable (e.g. opening the static file directly before
> deploying), food search automatically falls back to the public USDA database.

## Nutrition calculator

`lib/nutrition.js` exports `scaleNutrition(perServing, quantity)` → scaled
`{ calories, protein, carbs, fat }`. The same function is mirrored in
`index.html` for the browser (no build step).

Run the tests:

```bash
node lib/nutrition.test.js
```

## Local development

The frontend is static:

```bash
python3 -m http.server 3457
```

The `/api` functions only run on Vercel (or `vercel dev` with the env vars set).
