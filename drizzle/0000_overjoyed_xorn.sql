CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"company" varchar(255),
	"department" varchar(255),
	"location" text,
	"region" varchar(100),
	"job_type" varchar(100),
	"description" text,
	"requirements" text,
	"salary_range" varchar(100),
	"published_at" timestamp,
	"deadline" timestamp,
	"apply_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_source_external_id_unique" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"base_url" text NOT NULL,
	"scraper_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_scraped" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;