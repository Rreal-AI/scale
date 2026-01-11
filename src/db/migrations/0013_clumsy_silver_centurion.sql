ALTER TABLE "product_weight_samples" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_weight_samples" ADD COLUMN "item_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_weight_samples" ADD COLUMN "is_single_product" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_weight_samples" ADD COLUMN "check_number" text;--> statement-breakpoint
ALTER TABLE "product_weight_samples" ADD COLUMN "items_summary" text;