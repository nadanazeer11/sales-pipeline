# Architecture

## Processes

One long-running Node process (`apps/engine`) does everything that talks to Unipile:

```
           ┌──────────── apps/engine ────────────┐
Unipile ──▶│ server.ts  POST /webhooks/unipile   │──▶ webhooks/handlers.ts ─┐
webhooks   │ scheduler.ts  tick (60s)            │──▶ sequence/runner.ts ───┼──▶ Postgres
           │               poll (4h)             │──▶ sequence/sync.ts ─────┘
           └─────────────────────────────────────┘        │
                                                          ▼
                                                    unipile/client.ts ──▶ Unipile REST
```

Postgres is the only state. There is no separate job queue: `leads.next_action_at` is the queue.

## Lead state machine

```
active ──(invite step)──▶ awaiting_accept ──(relation.new | sync)──▶ active ──▶ … ──▶ completed
   │                            │
   │                            └──(timeout)──▶ withdraw ──▶ expired
   │
   ├──(they message us: webhook OR pre-send chat check)──▶ replied     (any open state, all campaigns)
   ├──(we message them by hand: pre-send chat check)─────▶ stopped
   ├──(pnpm cli lead:stop <url>)────────────────────────▶ stopped
   └──(2 non-limit errors)──────────────────────────────▶ failed
```

- `step_index` points at the step to run next. `advance()` in `campaigns/steps.ts` moves it on and applies the next step's delay.
- While `awaiting_accept`, `step_index` stays on the invite step and `next_action_at` is the invite expiry.
- A FIRST_DEGREE profile skips the invite; a PENDING request is reused, never re-sent.
- Follow-ups: every `message` step after the first. Max 5 messages per campaign.

## What stops follow-ups

| Cause                                 | Mechanism                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| They reply                            | `message.new` webhook (instant) **and** pre-send chat check (catches missed webhooks) |
| You write manually in the chat        | pre-send chat check → `stopped`                                                       |
| You stop one person                   | `pnpm cli lead:stop <linkedinUrl>`                                                    |
| Campaign paused/archived              | claim only picks `active` campaigns                                                   |
| Account paused (limit) / disconnected | tick skips non-active accounts                                                        |
| Sequence ends                         | last step → `completed`                                                               |
| Not stopped (by design)               | replies in a _different_ thread (InMail, email). Use `lead:stop`                      |

## Tick (per account, every TICK_INTERVAL_MS)

`runAccountTurn` in `sequence/runner.ts`:

1. Skip if `accounts.next_action_at` is in the future (random human-like gap between actions).
2. Skip outside the account's working hours/days (in its timezone).
3. Compute remaining quota from the `actions` table (rolling 24h / 7d), scaled by warmup factor.
4. Claim one due lead whose current step type still has quota (`FOR UPDATE SKIP LOCKED`, 10-min lease via `next_action_at`).
5. Execute the step (messages run the pre-send chat check first), write the lead patch **only if the lead is still in the state it was claimed in**, write an `actions` row, set the account's next gap.

At most one LinkedIn action per account per tick.

## Failure handling

- 429 (`api/too_many_requests`, `provider/too_many_requests`) → account paused 3 days, lead pushed back.
- 401 / 403 → account marked `disconnected` until an `account.status.running` webhook.
- 409 / 422 on an invite → lead `failed`, account untouched.
- Anything else → `attempts++`, retry in 1h, `failed` after 2 attempts.

## Webhooks

One Unipile webhook endpoint (`POST /webhooks/unipile`). Every request is HMAC-verified (`unipile-signature`, `t=…,v0=…`, SHA-256 over `${t}.${rawBody}`, 5-min tolerance) against `UNIPILE_WEBHOOK_SECRET`. The envelope `id` is stored in `webhook_events.event_key` first (duplicates ignored), then dispatched:

- `relation.new` → matching `awaiting_accept` lead connected.
- `message.new` with `is_sender: false` → matching lead `replied`.
- `account.status.running` / `.disconnected` / `.errored` → account connected/disconnected.

`relation.new` can lag up to ~6h on LinkedIn, so `sync.ts` also matches recent relations every POLL_INTERVAL_MS (default 2h). Sync only ever _connects_ leads; it never expires them.

Unipile expects a 2xx within 5s and retries twice (2s, 12s).
