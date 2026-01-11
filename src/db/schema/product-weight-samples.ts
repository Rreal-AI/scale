import { pgTable, uuid, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";
import { orders } from "./orders";

export const productWeightSamples = pgTable("product_weight_samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  org_id: text("org_id").notNull(),
  // product_id is optional (NULL for multi-product orders)
  product_id: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  order_id: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  weight: integer("weight").notNull(), // total weight in grams
  item_count: integer("item_count").notNull().default(1), // number of items in the order
  is_single_product: boolean("is_single_product").notNull().default(true), // for easy filtering
  check_number: text("check_number"), // for quick reference
  items_summary: text("items_summary"), // "2x Product A, 1x Product B"
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type ProductWeightSample = typeof productWeightSamples.$inferSelect;

export const productWeightSamplesRelations = relations(
  productWeightSamples,
  ({ one }) => ({
    product: one(products, {
      fields: [productWeightSamples.product_id],
      references: [products.id],
    }),
    order: one(orders, {
      fields: [productWeightSamples.order_id],
      references: [orders.id],
    }),
  })
);
