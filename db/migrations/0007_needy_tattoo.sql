DROP INDEX "inbound_messages_channel_id_received_at_idx";--> statement-breakpoint
CREATE INDEX "forms_tenant_id_idx" ON "forms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inbound_messages_line_channel_id_received_at_idx" ON "inbound_messages" USING btree ("line_channel_id","received_at");--> statement-breakpoint
CREATE INDEX "line_channels_tenant_id_idx" ON "line_channels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_members_tenant_id_idx" ON "tenant_members" USING btree ("tenant_id");