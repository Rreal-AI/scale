import { pgTable, text, uuid, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

// Types for rule conditions and actions
export interface RuleCondition {
  id: string;
  type: "category_quantity" | "total_items" | "order_value" | "product_quantity";
  operator: "every" | "greater_than" | "equal_to" | "less_than";
  value: number;
  category_id?: string; // for category_quantity type
  product_id?: string; // for product_quantity type
  description: string; // human readable description
}

export interface RuleAction {
  id: string;
  type: "add_product" | "add_weight" | "add_note";
  product_id?: string; // if adding existing product
  product_name?: string; // if adding custom product
  weight?: number; // in grams
  quantity?: number; // how many to add
  note?: string; // for add_note type
  description: string; // human readable description
}

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  org_id: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").$type<RuleCondition[]>().notNull().default([]),
  actions: jsonb("actions").$type<RuleAction[]>().notNull().default([]),
  is_active: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0), // for ordering rules
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const rulesRelations = relations(rules, ({ one }) => ({
  organization: one(organizations, {
    fields: [rules.org_id],
    references: [organizations.id],
  }),
}));