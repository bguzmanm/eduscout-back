ALTER TABLE "candidates" ADD COLUMN "notify_by_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "notify_by_telegram" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "telegram_chat_id" varchar(32);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "telegram_link_token" varchar(64);