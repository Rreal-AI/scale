CREATE TYPE "public"."visual_verification_status" AS ENUM('pending', 'verified', 'missing_items', 'extra_items', 'uncertain');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "visual_verification_status" "visual_verification_status";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "visual_verification_result" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "visual_verified_at" timestamp;