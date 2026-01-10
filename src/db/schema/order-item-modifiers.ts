import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { orderItems } from "./order-items";
import { relations } from "drizzle-orm";
import { modifiers } from "./modifiers";

export const orderItemModifiers = pgTable("order_item_modifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_item_id: uuid("order_item_id")
    .references(() => orderItems.id, { onDelete: "cascade" })
    .notNull(),
  modifier_id: uuid("modifier_id")
    .references(() => modifiers.id, { onDelete: "set null" }),

  name: text("name").notNull(),
  total_price: integer("total_price").notNull(), // in cents

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemModifiersRelations = relations(
  orderItemModifiers,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [orderItemModifiers.order_item_id],
      references: [orderItems.id],
    }),
    modifier: one(modifiers, {
      fields: [orderItemModifiers.modifier_id],
      references: [modifiers.id],
    }),
  })
);
