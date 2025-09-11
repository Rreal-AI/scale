ALTER TABLE "product_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "product_categories" CASCADE;--> statement-breakpoint
ALTER TABLE "rules" DROP CONSTRAINT "rules_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "rules" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "rules" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "rules" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "rules" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "min_quantity" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "max_quantity" integer;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "extra_weight" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "extra_product_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "display_order";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "quantity_threshold";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "weight_to_add";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "product_to_add";--> statement-breakpoint
ALTER TABLE "rules" DROP COLUMN "is_active";