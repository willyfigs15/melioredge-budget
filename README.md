# MeliorEdge Budget

Financial-foundation app for the MeliorEdge platform. Helps users run a
monthly budget, track transactions (manual + CSV import), and surfaces a
simple Financial Health Score / "Ready to Invest" signal that eventually
unlocks the Training Journal.

- **Subdomain (prod):** `budget.melioredge.com`
- **Ports (dev):** frontend `3005`, backend `8005`, db `127.0.0.1:5435`
- **Stack:** Next.js 14 (App Router, TypeScript) + FastAPI + SQLAlchemy + Alembic + PostgreSQL
- **Auth:** No login UI here. The dashboard mints a short-lived `handoff`
  JWT, budget validates it with the shared `SECRET_KEY` and sets its own
  session cookie.

## Local development

```bash
# 1. One-time: shared docker network (only if not already created)
docker network create melioredge || true

# 2. Copy env and set passwords (MUST match dashboard SECRET_KEY)
cp .env.example .env
cp backend/.env.example backend/.env
# edit backend/.env → SECRET_KEY must match melioredge-dashboard/backend/.env

# 3. Up
docker compose up --build
```

Frontend: http://localhost:3005  |  API: http://localhost:8005/api/health

To land on budget already authenticated during dev, go to the dashboard
(`http://localhost:3002`), log in, then click the Budget tile — it
redirects to `http://localhost:3005?token=<jwt>`.

## Production deploy (VPS)

Every MeliorEdge app ships the same way:

1. `ssh` onto the VPS and `git pull` this repo into `~/apps/melioredge-budget`.
2. Create `backend/.env` with the production `SECRET_KEY` (identical to
   dashboard's) and `COOKIE_DOMAIN=.melioredge.com`, `COOKIE_SECURE=true`,
   `ENVIRONMENT=production`.
3. Set root `.env` with prod `NEXT_PUBLIC_*` URLs (see `.env.example`).
4. `docker compose up -d --build`
5. Drop
   `melioredge-nginx/conf.d/budget.melioredge.com.conf` in place (already
   committed in the nginx repo) and reload:
   `docker exec melioredge-nginx nginx -s reload`.
6. Issue the cert: `docker exec melioredge-nginx certbot --nginx -d budget.melioredge.com`.

## SSO flow

```
dashboard                                       budget
──────────                                      ──────
user clicks "Budget" tile
  →  GET  /api/auth/handoff/budget
  ←  { handoff_token: <jwt> }
browser → budget.melioredge.com/?token=<jwt>
                                                AuthProvider sees ?token=…
                                                POST /api/auth/handoff { token }
                                                ← sets mel_budget_access cookie
                                                URL param stripped; stays on /
```

The handoff JWT is HS256-signed by dashboard with the shared `SECRET_KEY`
and carries `{type: "handoff", app: "budget", app_access, sub, name, email}`.
Budget validates `type`, `app`, and that `"budget" in app_access`.

## Data model

- `users` — mirror of dashboard user, populated from handoff payload.
- `budgets (user_id, year, month)` — unique per (user, month).
- `categories (budget_id, name, limit_amount, color)`
- `transactions (user_id, category_id?, date, amount, type: income|expense, source: manual|import)`
- `imports (user_id, filename, rows_*, status)` — CSV run log.

Amounts are always positive `Numeric(12,2)`; the sign is carried by
`type`. CSV import dedupes via a `external_id` hash of
`date|amount|description`.

## API (summary)

```
POST   /api/auth/handoff                       public — validates dashboard handoff
GET    /api/auth/me                            session
POST   /api/auth/logout                        session

GET    /api/budgets                            list
POST   /api/budgets                            create {year, month, name}
GET    /api/budgets/{id}
GET    /api/budgets/by-period/{year}/{month}
DELETE /api/budgets/{id}

GET    /api/budgets/{id}/categories
POST   /api/budgets/{id}/categories
PUT    /api/budgets/{id}/categories/{cid}
DELETE /api/budgets/{id}/categories/{cid}

GET    /api/transactions?start=&end=&category_id=&type=&limit=&offset=
POST   /api/transactions
PUT    /api/transactions/{id}
DELETE /api/transactions/{id}

POST   /api/imports/preview    (multipart file)
POST   /api/imports/confirm    ({filename, mapping, content_b64, default_category_id})
GET    /api/imports

GET    /api/dashboard/summary?year=&month=
```

## Roadmap (post-MVP)

- AI-based spending insights (categorization, recurring detection)
- Smarter Financial Health Score + trend
- "Ready to Invest" gate wiring that hands off into the Training Journal
- Bank feed integrations (Plaid / regional equivalents)
- Multi-currency
