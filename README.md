# sales-pipeline

LinkedIn outreach sequencer on Unipile: visit → connect → message → follow-ups, stops on reply.

## Setup

```
cp .env.example .env              # fill UNIPILE_API_KEY
pnpm install
docker compose up -d
pnpm db:migrate
```

## Run a campaign

```
pnpm cli unipile:accounts                                   # find your acc_… account id
pnpm cli account:add <unipileAccountId> "Me" --tz Africa/Cairo --warmup
pnpm cli campaign:create examples/campaign.json             # edit unipileAccountId first
pnpm cli leads:import <campaignId> examples/leads.csv
pnpm cli campaign:start <campaignId>
pnpm dev                                                    # engine
pnpm cli webhooks:register https://<public-tunnel-url>      # once; put the returned secret in UNIPILE_WEBHOOK_SECRET
pnpm cli campaigns                                          # progress per state
```

CSV needs `linkedin_url`; `first_name`, `last_name`, `company` are optional; any other column becomes a `{{variable}}` for templates.

See `docs/` for architecture, decisions, Unipile notes and the roadmap.
