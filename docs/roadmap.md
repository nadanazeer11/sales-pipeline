# Roadmap

## Phase 0 — Probe real Unipile behaviour

- [x] Fetch-based Unipile client + CLI `probe`
- [x] Webhook endpoint with optional payload capture
- [x] Migrated to Unipile API v2 (client, signed webhooks, relation requests, visit reports)
- [x] Unipile dev app with account + service keys in `.env`
- [x] Mock account connected and probed; full engine run against real Unipile API (see `docs/unipile.md`)
- [x] Webhook registration + signature verified through an ngrok tunnel
- [x] Connect a real LinkedIn account (read-only checks passed)
- [ ] Expose engine publicly (`cloudflared tunnel --url http://localhost:8787` or ngrok), `pnpm cli webhooks:register <url>`, set `UNIPILE_WEBHOOK_SECRET`
- [x] Real campaign with 5 consenting connections: messages, follow-ups, reply-stop, real `message.new` webhooks
- [ ] Real invite → accept cycle (needs a non-connection who agrees) to see `relation.new`
- [x] `message.new` fixture replaced with a redacted real payload
- [ ] `relation.new` / `account.status.*` fixtures from real payloads

## Phase 1 — Single-account engine (code done, untested against real Unipile)

- [x] Schema + migration: accounts, campaigns, leads, actions, webhook_events
- [x] Steps: visit / invite (with timeout + withdraw) / message, templating
- [x] Per-account tick: working hours, rolling quotas, warmup, random gaps, SKIP LOCKED claim
- [x] Webhook handlers: accept, reply-stop, account status; dedupe
- [x] Accept polling fallback via relations
- [x] Error policy: limit → pause 3d, disconnect → mark, other → retry once
- [x] CLI: accounts, campaigns, CSV import, start/pause, tick, sync
- [x] Smoke-tested end-to-end against a local mock Unipile
- [x] First real campaign (5 friendly leads)
- [ ] Command to withdraw stale pending invites (account has 53)
- [ ] Deploy engine (Railway/Fly) + hosted Postgres (Neon/Supabase)

## Phase 2 — Multi-account + dashboard

- [x] `apps/web` Next.js dashboard: campaigns, lead table with filters, lead side panel with timeline, stop lead
- [x] Inbox view of replies
- [x] Campaign builder UI with live preview (replaces JSON files), CSV import dialog, start/pause
- [x] Accounts: usage vs limits, settings panel (limits, hours, days, gaps, warm-up), connect + add account
- [x] Optional `DASHBOARD_PASSWORD` basic auth
- [ ] Deploy (engine + hosted Postgres + dashboard)
- [ ] Bulk actions on leads (stop selected), campaign archive/duplicate

## Phase 3 — Intelligence

- [ ] LLM-personalised notes/messages from profile data
- [ ] Reply classification (interested / not now / OOO)
- [ ] CRM sync, A/B message variants, Sales Navigator lead sourcing
