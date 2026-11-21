CREATE TYPE "public"."account_status" AS ENUM('active', 'paused', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."action_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."action_type" AS ENUM('visit', 'invite', 'message', 'withdraw');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lead_state" AS ENUM('active', 'awaiting_accept', 'replied', 'completed', 'expired', 'failed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unipile_account_id" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"work_start_hour" integer DEFAULT 9 NOT NULL,
	"work_end_hour" integer DEFAULT 18 NOT NULL,
	"work_days" integer[] DEFAULT '{1,2,3,4,5}' NOT NULL,
	"limits" jsonb NOT NULL,
	"min_gap_minutes" integer DEFAULT 2 NOT NULL,
	"max_gap_minutes" integer DEFAULT 8 NOT NULL,
	"warmup_started_at" timestamp with time zone,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"paused_until" timestamp with time zone,
	"pause_reason" text,
	"next_action_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_unipileAccountId_unique" UNIQUE("unipile_account_id")
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"lead_id" uuid,
	"type" "action_type" NOT NULL,
	"status" "action_status" NOT NULL,
	"error" text,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"linkedin_url" text NOT NULL,
	"public_identifier" text NOT NULL,
	"user_id" text,
	"first_name" text,
	"last_name" text,
	"company" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" "lead_state" DEFAULT 'active' NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"next_action_at" timestamp with time zone DEFAULT now() NOT NULL,
	"relation_request_id" text,
	"chat_id" text,
	"invited_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_eventKey_unique" UNIQUE("event_key")
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_account_id_type_created_at_index" ON "actions" USING btree ("account_id","type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_campaign_id_public_identifier_index" ON "leads" USING btree ("campaign_id","public_identifier");--> statement-breakpoint
CREATE INDEX "leads_state_next_action_at_index" ON "leads" USING btree ("state","next_action_at");--> statement-breakpoint
CREATE INDEX "leads_user_id_index" ON "leads" USING btree ("user_id");