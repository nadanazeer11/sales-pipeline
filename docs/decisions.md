# Decisions

Newest at the bottom. One short entry per non-obvious choice.

### 2026-11-21 — Build on Unipile instead of HeyReach

Unipile bills per connected account (€49/mo for up to 10) with no per-action fees; HeyReach is ~$79/sender/mo. Unipile only provides primitives, so sequencing, pacing and safety are ours.

### 2026-11-21 — pnpm workspace, no Turborepo

`apps/engine` (long-running), future `apps/web` (dashboard), shared `packages/core`. Three packages don't justify Turborepo. Core is consumed as TS source (no build step); engine runs via `tsx`.

### 2026-11-21 — Postgres is the queue (no pg-boss / BullMQ)

Scheduling is per account (quotas, working hours, random gaps), not per job. `leads.next_action_at` + `SKIP LOCKED` keeps one source of truth and avoids reconciling a queue with lead state.

### 2026-11-21 — Own fetch client instead of an SDK

The `unipile-node-sdk` is v1-only, lacks webhook sources we need and throws on any response drift. Our client is ~130 lines with lenient zod (`looseObject`) schemas covering only what we use.

### 2026-11-21 — Invite step owns the accept wait

`invite { timeoutDays }` instead of a separate `await_accept` step: fewer step types, and the expiry is just `next_action_at` while `awaiting_accept`.

### 2026-11-21 — Sync never expires leads

Smoke test showed "not pending and not in relations → expired" wrongly expires everything on any ID mismatch or missed page. Expiry only comes from the invite timeout (which withdraws the invite).

### 2026-11-21 — Rolling 24h/7d quotas counted from `actions`

Simpler than calendar days per timezone and slightly more conservative. The audit log is the source of truth for usage.

### 2026-11-21 — TypeScript 5.9, not 7

TS 7 (native) is out, but drizzle-kit/tsx/vitest compatibility is unproven; revisit later.

### 2026-11-21 — Unipile API v2 only (no v1)

Decided by the user. v2 (`https://api.unipile.com/v2/{acc_id}/...`) is Unipile's current API; v1 (DSN host, `/api/v1`) is legacy. Consequences:

- Visits are explicit: GET profile, then `POST users/visit-profile?token=<notify_visit_token>`.
- Invites are "relation requests"; ids are `user_id` / `relation_request_id` in our schema.
- Webhooks use one endpoint with `trigger_events`, an `{id, type, account_id, payload}` envelope and HMAC `unipile-signature` verification instead of a shared header.
- Source of truth for shapes: the "Unipile API (reference)" spec in the Unipile MCP (the other spec listed there is older).

### 2026-11-21 — Profile state is checked before inviting (mandatory)

Verified on a real account: inviting an existing 1st-degree connection is **accepted** by Unipile/LinkedIn and creates a real pending request (`SENT_…`). Nothing upstream protects us, so the runner must never invite without first knowing `network_distance` (FIRST_DEGREE → skip invite) and `relation_request_status` (PENDING → reuse the request). Any 409/422 on an invite still marks that lead failed without pausing the account.

### 2026-11-21 — LinkedIn messages go into the existing chat, else the primary inbox

Verified on a real account: `POST /chats/send` returns `501 api/not_implemented` for LinkedIn ("Use Start a Chat in the given inbox endpoint"). The message step now (1) looks up an existing 1to1 chat via `GET /users/{id}/chat` and sends there, so the conversation continues in the same thread, and (2) otherwise starts one in `CLASSIC_PRIMARY` via `/inboxes/{inbox}/chats/send`. Plain `/chats/send` is only a fallback for providers without inboxes (the mock).

### 2026-11-21 — Every message is preceded by a chat check (no duplicates, no follow-up after a reply)

A real run showed a send can succeed while our request fails (network drop). A crash between sending and saving has the same effect. So before **every** message into an existing chat, `inspectChat` (pure, `sequence/chat.ts`) reads the last 20 messages since the lead was created and decides:

- inbound message → `replied` (covers missed or late webhooks);
- our own message that is not one of this campaign's rendered texts → `stopped` (the user took over manually);
- our own message identical to this step's text → already sent, advance without sending;
- otherwise send.
  Invite steps always re-read the profile first, so a request that already went out is found as PENDING and reused. Withdrawing tolerates "already gone". Requests time out after 45s.

### 2026-11-21 — Lead writes are conditional on the state the turn started with

A reply webhook can land while a turn is in flight. Runner and `markConnected` writes use `updateLead(id, patch, expectedState)`, so a stale turn can never flip `replied`/`stopped` back to `active`. Replies stop the person in every campaign of that account (`markRepliedByUser`).

### 2026-11-21 — Campaign limits: ≤10 steps, ≤5 messages, distinct templates

One opener plus up to four follow-ups. Templates must differ, otherwise "already sent" detection could not tell steps apart.
