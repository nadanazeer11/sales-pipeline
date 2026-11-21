# sales-pipeline

Self-built LinkedIn outreach sequencer (HeyReach replacement) on top of the Unipile API **v2** (never v1).
Sequence per lead: visit profile → connection request → message → follow-ups, stop on reply.

## Commands

```
docker compose up -d          # local Postgres on :5433
pnpm db:generate              # after editing packages/core/src/db/schema.ts
pnpm db:migrate
pnpm dev                      # engine: webhook server + scheduler (watch mode)
pnpm cli <command>            # operator CLI, run with no command for the list
pnpm check                    # biome + tsc + vitest — must pass before finishing any task
```

## Layout

```
apps/engine/src     main.ts (boot), server.ts (Hono webhooks), scheduler.ts (tick + poll loops), cli.ts
packages/core/src   all domain logic, one folder per domain:
  accounts/         accounts.ts (repo), quota.ts (pure: limits, warmup, working hours, gaps)
  campaigns/        campaigns.ts (repo), steps.ts (pure: step schema, render, advance)
  leads/            leads.ts (repo + claim/transitions), import.ts (CSV)
  sequence/         runner.ts (one account turn = one LinkedIn action), chat.ts (pure pre-send check), sync.ts (accept polling)
  unipile/          client.ts (v2 fetch wrapper), payloads.ts (zod schemas + webhook parsing)
  webhooks/         handlers.ts (dedupe + dispatch), signature.ts (HMAC verify)
  db/               schema.ts (single schema file), client.ts
packages/core/test  vitest; fixtures/*.json are webhook payloads
```

## Conventions

- No code comments. Names carry intent; non-obvious "why" goes in `docs/decisions.md`.
- One folder per domain, 1–3 files each. Repo queries and logic live together until a file nears ~250 lines. No file-per-function.
- Pure logic (no db/network) goes in files like `quota.ts` / `steps.ts` so it is unit-testable without env.
- Named exports only. `packages/core/src/index.ts` is the only barrel.
- zod at every boundary (env, Unipile responses, webhooks, CSV, campaign JSON). No `any`.
- Apps import only from `@sp/core`, never deep paths.
- New Unipile endpoint → check it in the Unipile MCP ("Unipile API (reference)" spec), add to `unipile/client.ts` + schema in `payloads.ts`.
- New step type → `campaigns/steps.ts` schema + branch in `sequence/runner.ts` + test.
- Schema change → edit `db/schema.ts`, `pnpm db:generate --name <change>`, commit the migration.

## Docs (read when relevant, not auto-loaded)

| File                   | Read when                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| `docs/architecture.md` | Touching the scheduler, runner, lead states, or webhooks             |
| `docs/decisions.md`    | Before changing a core choice; append a dated entry after making one |
| `docs/unipile.md`      | Calling Unipile, handling its errors/limits, or webhook payloads     |
| `docs/roadmap.md`      | Starting a session or picking next work; tick items off when done    |

## Git

Personal repo: remote `git@github-nadanazeer11:nadanazeer11/sales-pipeline.git`, repo-local email is the personal gmail. No co-author trailers.
