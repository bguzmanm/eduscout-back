CREATE TABLE "scraping_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"total_new" integer DEFAULT 0 NOT NULL,
	"total_updated" integer DEFAULT 0 NOT NULL,
	"total_errors" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"per_source" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
