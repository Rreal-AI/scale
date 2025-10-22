ALTER TYPE "public"."order_status" ADD VALUE 'archived';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "archived_reason" text;