import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";
import { orders } from "./orders";

export const productWeightSamples = pgTable("product_weight_samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  org_id: text("org_id").notNull(),
  product_id: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  order_id: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  weight: integer("weight").notNull(), // in grams
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
