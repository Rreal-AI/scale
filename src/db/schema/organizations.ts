import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // clerk id
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  order_weight_delta_tolerance: integer("order_weight_delta_tolerance")
    .notNull()
    .default(100), // in grams (~3.5 oz tolerance)
  visual_verification_prompt: text("visual_verification_prompt"), // Custom AI prompt for visual verification (null = use default)
  inbound_order_email_inbox_id: uuid("inbound_order_email_inbox_id")
    .notNull()
    .defaultRandom(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
