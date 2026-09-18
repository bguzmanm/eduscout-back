ALTER TABLE "candidates" ADD COLUMN "reset_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "reset_token_expires_at" timestamp;