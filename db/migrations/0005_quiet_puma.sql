CREATE INDEX IF NOT EXISTS "inbound_messages_channel_id_received_at_idx" ON "inbound_messages" USING btree ("line_channel_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_tenant_id_submitted_at_idx" ON "submissions" USING btree ("tenant_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_form_id_submitted_at_idx" ON "submissions" USING btree ("form_id","submitted_at");
