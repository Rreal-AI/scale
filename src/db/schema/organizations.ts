import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // clerk id
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  order_weight_delta_tolerance: integer("order_weight_delta_tolerance")
    .notNull()
    .default(100),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
