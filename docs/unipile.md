# Unipile notes (API v2)

We use **v2 only**. Base `https://api.unipile.com/v2`, header `X-API-KEY`, account ids look like `acc_…`.

Two key types:

- `UNIPILE_API_KEY`: account-level key. It can use every connected account (profiles, invites, chats, auth links). Used for everything at runtime.
- `UNIPILE_SERVICE_KEY`: service key, from the dashboard only. Required for app management: webhook endpoints, API keys, scopes. Used only by `webhooks:register`.
  `UNIPILE_BASE_URL` can point elsewhere (local mocks).

Source of truth: the Unipile MCP (`claude mcp add --transport http --scope user unipile "https://developer.unipile.com/mcp?branch=v2.0"`). Use the spec titled **"Unipile API (reference)"**; the "(1)" spec is older (e.g. puts `user_id` in the relation-request path).
Docs index: https://developer.unipile.com/v2.0/llms.txt

## Endpoints we use (`unipile/client.ts`)

| Purpose                         | Call                                                                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List accounts                   | `GET /accounts/?provider=linkedin` → `data[].id`                                                                                                                                                                              |
| Profile                         | `GET /{acc}/users/{user_id or public slug}?variant=linkedin_classic` → `id`, `first_name`, `specifics.network_distance`, `specifics.notify_visit_token`, `specifics.relation_request_status`, `specifics.relation_request.id` |
| Report visit                    | `POST /{acc}/users/visit-profile?token={notify_visit_token}`                                                                                                                                                                  |
| Invite                          | `POST /{acc}/users/me/relation-requests` json `{user_id, message?}` → `id`                                                                                                                                                    |
| Withdraw                        | `POST /{acc}/users/me/relation-requests/{id}/cancel`                                                                                                                                                                          |
| Relations                       | `GET /{acc}/users/me/relations?limit=&cursor=` → `data[].user.{id, public_identifier}`, `next_cursor`                                                                                                                         |
| Existing chat with a user       | `GET /{acc}/users/{user_id}/chat` → `data[].{chat_id, inbox_id, has_history}`                                                                                                                                                 |
| Start chat (LinkedIn)           | `POST /{acc}/inboxes/CLASSIC_PRIMARY/chats/send` json `{users_ids, text}` → `chat_id`                                                                                                                                         |
| Start chat (no-inbox providers) | `POST /{acc}/chats/send`, which LinkedIn rejects with 501                                                                                                                                                                     |
| Recent messages                 | `GET /{acc}/chats/{chat_id}/messages?limit=` → `data[].{id, text, is_sender, timestamp}` newest first                                                                                                                         |
| Message in chat                 | `POST /{acc}/chats/{chat_id}/messages/send` json `{text}`                                                                                                                                                                     |
| Webhook endpoint                | `POST /webhooks/endpoints/` json `{url, trigger_events, account_ids?}` → `id`, `secret`                                                                                                                                       |

Notes:

- `network_distance` values: `SELF`, `FIRST_DEGREE`, `SECOND_DEGREE`, `THIRD_DEGREE`, `OUT_OF_NETWORK`.
- `relation_request_status`: `PENDING`, `IGNORED`, `WITHDRAWN`.
- Public slug as `user_id` is documented for the `linkedin_classic` variant, so we always send `variant=linkedin_classic`.

## Webhooks

- Envelope: `{ id: "evt_…", type, account_id, account_provider, created_at, payload }`. `id` is our dedupe key.
- Events subscribed: `relation.new`, `message.new`, `account.status.running|disconnected|errored`.
- `relation.new` payload is a UserRelation: `payload.user.{id, public_identifier}`. It can lag **up to ~6h** on LinkedIn.
- `message.new` payload is a Message: `id`, `chat_id`, `sender_id`, `is_sender` (true = sent by our account, ignore).
- Signature: header `unipile-signature: t=<unix>,v0=<hex>`, HMAC-SHA256 of `${t}.${rawBody}` with the endpoint `secret`.
- Must answer 2xx within 5s; retried after 2s and 12s.

## Errors

RFC 7807: `{ object: "Error", type, status, title, detail, req_id }`.

| Type                                                            | Status    | Our handling                       |
| --------------------------------------------------------------- | --------- | ---------------------------------- |
| `api/too_many_requests`, `provider/too_many_requests`           | 429       | pause account 3d                   |
| `provider/invalid_authorization` (needs re-auth)                | 401       | mark account disconnected          |
| `api/account_restricted`, `api/inactive_subscription`           | 403       | mark account disconnected          |
| `provider/conflict` / `provider/unprocessable_entity` on invite | 409 / 422 | lead failed                        |
| anything else                                                   |           | retry once in 1h, then lead failed |

## Limits (LinkedIn's, Unipile enforces none)

- Invites: ~100 per rolling week is the commonly observed ceiling; we default to 20/day, 100/week.
- Invite note: ~300 chars on paid accounts, ~200 on free; free accounts get very few notes per month.
- Profile views: ~80–100/day ceiling; we default to 50.
- After a limit error, pause for days. Retrying immediately turns warnings into restrictions.

## Mock provider (dev app)

Connect without credentials: `POST /v2/auth/intent {"provider":"mock","credentials":{}}`, which returns an `acc_…` with `provider: "mock"`.
Findings from probing it (2026-11-21):

- Users `mock-user-1` … `mock-user-5`: 1 and 2 are FIRST_DEGREE relations, 3 is SECOND, 4 is THIRD, 5 is OUT_OF_NETWORK with a pending sent request. Own id is `mock-user-me`.
- Profile lookup works **by id only** (`mock-user-3`), not by public slug (`aimee_goldner` returns 404). Use `https://www.linkedin.com/in/mock-user-N` in lead CSVs so the slug equals the id.
- Profiles have no `notify_visit_token` and no `relation_request_status`. `visit-profile` accepts any token.
- Invites, cancel, relations, start chat and send message all work through our client.
- Not realistic: it accepts invites to existing connections and duplicate invites. Invites are never accepted.
- **Emits no webhooks.** An endpoint subscribed to `message.new` etc. got zero deliveries. Webhook behaviour must be tested on a real LinkedIn account.
- Full engine run on the mock: visit → invite → messages, already-connected lead skipped the invite and was messaged to completion.

## Real LinkedIn run (2026-11-21, 5 consenting connections)

- LinkedIn inboxes: `CLASSIC_PRIMARY`, `CLASSIC_ARCHIVED`, `CLASSIC_SPAM`, `CLASSIC_JOBS`, `CLASSIC_INMAIL`, `CLASSIC_STARRED`. Chat ids look like `CLASSIC_2-…`.
- `message.new` webhooks arrive ~2s after our own sends (`is_sender: true`) and within seconds of a reply (`is_sender: false`). Reply-stop worked end to end.
- Real envelope also carries `object: "Event"`, `hash`, `account_scope_id`, `application_id`, `application_production`. See `test/fixtures/message_new.real-redacted.json`.
- Message step without a stored `user_id` costs one profile fetch, recorded as a `visit` action (no visit is reported to the person).

## Still to verify with a real LinkedIn account

- [x] Profile lookup by public slug works (with `variant=linkedin_classic`). Verified 2026-11-21 on a real account.
- [ ] Visit report shows in the target's "who viewed your profile".
- [x] Relations `user.id` equals profile `id` (both `ACoA…`, 39 chars). Verified 2026-11-21.
- [x] Real LinkedIn profiles include `specifics.notify_visit_token`; relations page size 100 with `next_cursor`.
- [x] Inviting an existing connection does NOT error: it returns `{id: "SENT_<digits>"}` and creates a real pending request (verified 2026-11-21, withdrawn right after). The pre-invite profile check is the only guard.
- [x] Relation request ids on real LinkedIn look like `SENT_<digits>`.
- [ ] Error type when inviting someone already invited.
- [x] Real `message.new` payload captured and stored redacted.
- [ ] Real `relation.new` and `account.status.*` payloads (still hand-written samples). Capture with `CAPTURE_WEBHOOKS=true`, **redact**, and replace the `*.sample.json` files.
