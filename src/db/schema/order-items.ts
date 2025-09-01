import { pgTable, uuid, integer, timestamp, text } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { products } from "./products";
import { orderItemModifiers } from "./order-item-modifiers";
import { relations } from "drizzle-orm";

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_id: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  product_id: uuid("product_id")
    .references(() => products.id)
    .notNull(),

  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  total_price: integer("total_price").notNull(),

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type OrderItem = typeof orderItems.$inferSelect;

export const orderItemsRelations = relations(orderItems, ({ many, one }) => ({
  modifiers: many(orderItemModifiers),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
}));
