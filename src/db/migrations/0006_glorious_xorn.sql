ALTER TABLE "rules" ADD COLUMN "quantity_threshold" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "min_quantity";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "max_quantity";