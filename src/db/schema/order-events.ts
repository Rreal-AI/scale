import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const orderEventType = pgEnum("order_event_type", [
  "created",
  "weight_verified",
  "visual_verified",
  "status_changed",
  "archived",
  "unarchived",
]);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    org_id: text("org_id").notNull(),

    event_type: orderEventType("event_type").notNull(),
    event_data: jsonb("event_data"),
    actor_id: text("actor_id"),

    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("order_events_created_at_idx").on(table.created_at),
    index("order_events_order_id_idx").on(table.order_id),
    index("order_events_org_id_idx").on(table.org_id),
  ]
);

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.order_id],
    references: [orders.id],
  }),
}));

export type OrderEvent = typeof orderEvents.$inferSelect;
export type NewOrderEvent = typeof orderEvents.$inferInsert;

export interface CreatedEventData {
  check_number: string;
  customer_name: string;
  items_count: number;
  expected_weight: number;
  order_type: "delivery" | "takeout";
}

export interface WeightVerifiedEventData {
  expected_weight: number;
  actual_weight: number;
  delta_weight: number;
  is_reweigh: boolean;
  previous_actual_weight?: number | null;
}

export interface VisualVerifiedEventData {
  status: string;
  confidence: number;
  missing_items: string[];
  extra_items: string[];
  match: boolean;
}

export interface StatusChangedEventData {
  from_status: string;
  to_status: string;
  reason?: string;
}

export interface ArchivedEventData {
  reason: string;
  auto_archived: boolean;
}
