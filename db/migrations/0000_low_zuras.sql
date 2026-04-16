CREATE TABLE "inbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_channel_id" uuid NOT NULL,
	"line_user_id" uuid,
	"event_type" text NOT NULL,
	"message_type" text,
	"text" text,
	"raw_event" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"channel_secret" text NOT NULL,
	"channel_access_token" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_channels_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "line_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_channel_id" uuid NOT NULL,
	"line_user_id" text NOT NULL,
	"display_name" text,
	"picture_url" text,
	"language" text,
	"followed_at" timestamp with time zone,
	"unfollowed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_users_line_channel_id_line_user_id_unique" UNIQUE("line_channel_id","line_user_id")
);
--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_line_channel_id_line_channels_id_fk" FOREIGN KEY ("line_channel_id") REFERENCES "public"."line_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_line_user_id_line_users_id_fk" FOREIGN KEY ("line_user_id") REFERENCES "public"."line_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_users" ADD CONSTRAINT "line_users_line_channel_id_line_channels_id_fk" FOREIGN KEY ("line_channel_id") REFERENCES "public"."line_channels"("id") ON DELETE cascade ON UPDATE no action;