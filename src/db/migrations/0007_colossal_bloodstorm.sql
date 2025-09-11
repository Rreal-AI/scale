ALTER TABLE "rules" DROP CONSTRAINT "rules_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "conditions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "actions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "quantity_threshold";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "extra_weight";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "extra_product_name";