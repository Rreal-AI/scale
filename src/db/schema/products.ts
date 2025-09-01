import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  org_id: text("org_id").notNull(), // organization id from clerk

  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
  weight: integer("weight").notNull(), // in grams

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
