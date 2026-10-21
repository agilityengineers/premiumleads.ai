CREATE TABLE "activity_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor" text,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contact_id" bigint NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"event_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"variant_slug" text,
	"contact_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email_key" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"company" text,
	"source" text NOT NULL,
	"ad_contact_id" text,
	"bvi_interviewee_id" text,
	"program" text,
	"bvi_stage" text,
	"advisor_email" text,
	"routing_destination" text,
	"variant_slug" text,
	"call_booked_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"next_meeting_at" timestamp with time zone,
	"next_meeting_type" text,
	"next_meeting_id" text,
	"interview_completed_at" timestamp with time zone,
	"blueprint_delivered_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"snapshot_at" timestamp with time zone,
	"last_event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_key_unique" UNIQUE("email_key"),
	CONSTRAINT "contacts_bvi_interviewee_id_unique" UNIQUE("bvi_interviewee_id")
);
--> statement-breakpoint
CREATE TABLE "integration_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"target" text DEFAULT 'authority_desk' NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"submission_id" bigint,
	"contact_id" bigint,
	"body" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"last_status" integer,
	"parked" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_outbox_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "integration_secrets" (
	"id" text PRIMARY KEY NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"tag" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prequalification_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"company" text NOT NULL,
	"client_type" text NOT NULL,
	"variant_slug" text,
	"answers" jsonb NOT NULL,
	"routing_destination" text,
	"contact_id" bigint,
	"ad_contact_id" text,
	"bvi_interviewee_id" text,
	"bvi_booking_url" text,
	"ad_synced_at" timestamp with time zone,
	"ad_sync_error" text,
	"ad_sync_attempts" integer DEFAULT 0 NOT NULL,
	"ad_parked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT true NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"snapshot" "bytea",
	"snapshot_type" text,
	"snapshot_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"path" text,
	"referrer" text,
	"visitor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'advisor' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"audience" text NOT NULL,
	"builtin" boolean DEFAULT false NOT NULL,
	"booking_url" text,
	"cta_mode" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"generated_by" text,
	"og_image" "bytea",
	"og_image_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prequalification_submissions" ADD CONSTRAINT "prequalification_submissions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_events_source_event_idx" ON "contact_events" USING btree ("source","event_id");--> statement-breakpoint
CREATE INDEX "contact_events_contact_idx" ON "contact_events" USING btree ("contact_id","occurred_at");--> statement-breakpoint
CREATE INDEX "contacts_last_event_idx" ON "contacts" USING btree ("last_event_at");--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "integration_outbox" USING btree ("delivered_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "prequal_created_idx" ON "prequalification_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prequal_contact_idx" ON "prequalification_submissions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "prequal_email_idx" ON "prequalification_submissions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "traffic_created_idx" ON "traffic_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "traffic_slug_idx" ON "traffic_events" USING btree ("slug","created_at");--> statement-breakpoint
CREATE INDEX "variants_published_idx" ON "variants" USING btree ("published");