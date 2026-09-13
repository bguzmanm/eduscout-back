ALTER TABLE "alert_matches" DROP CONSTRAINT "alert_matches_alert_id_alerts_id_fk";
--> statement-breakpoint
ALTER TABLE "alert_matches" DROP CONSTRAINT "alert_matches_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_candidate_id_candidates_id_fk";
--> statement-breakpoint
ALTER TABLE "alert_matches" ADD CONSTRAINT "alert_matches_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_matches" ADD CONSTRAINT "alert_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;