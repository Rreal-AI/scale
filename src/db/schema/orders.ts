import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { orderItems } from "./order-items";

export const orderType = pgEnum("order_type", ["delivery", "takeout"]);

export const orderStatus = pgEnum("order_status", [
  "pending_weight", // Esperando a ser pesado
  "weighed", // Pesado y verificado
  "completed", // Proceso completado
  "cancelled", // Cancelado
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  org_id: text("org_id").notNull(), // organization id from clerk

  status: orderStatus("status").notNull().default("pending_weight"),
  type: orderType("type").notNull(),

  check_number: text("check_number").notNull(),

  customer_name: text("customer_name").notNull(),
  customer_email: text("customer_email"),
  customer_phone: text("customer_phone"),
  customer_address: text("customer_address"),

  subtotal_amount: integer("subtotal_amount").notNull(), // in cents
  tax_amount: integer("tax_amount").notNull(), // in cents
  total_amount: integer("total_amount").notNull(), // in cents

  expected_weight: integer("expected_weight").notNull(), // in grams, calculated at the time of the weight verification
  actual_weight: integer("actual_weight"), // in grams
  delta_weight: integer("delta_weight"), // in grams

  input: text("input").notNull(),
  structured_output: jsonb("structured_output"),

  weight_verified_at: timestamp("weight_verified_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));
