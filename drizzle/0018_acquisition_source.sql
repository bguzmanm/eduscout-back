ALTER TABLE "candidates" ADD COLUMN "acquisition_source" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "acquisition_medium" varchar(100);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "acquisition_campaign" varchar(150);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "acquisition_referrer" varchar(255);