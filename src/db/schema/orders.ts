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
import { orderEvents } from "./order-events";

export const orderType = pgEnum("order_type", ["delivery", "takeout"]);

export const orderStatus = pgEnum("order_status", [
  "pending_weight", // Esperando a ser pesado
  "weighed", // Pesado y verificado
  "completed", // Proceso completado
  "cancelled", // Cancelado
  "archived", // Archivado por inactividad
]);

export const visualVerificationStatus = pgEnum("visual_verification_status", [
  "pending", // Enviado a procesar
  "verified", // Verificado correctamente
  "missing_items", // Items faltantes detectados
  "extra_items", // Items extra detectados
  "uncertain", // No se pudo determinar con certeza
  "wrong_image", // La foto es de una orden completamente diferente
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

  // Visual verification fields
  visual_verification_status: visualVerificationStatus(
    "visual_verification_status"
  ),
  visual_verification_result: jsonb("visual_verification_result"),
  visual_verified_at: timestamp("visual_verified_at"),
  visual_verification_started_at: timestamp("visual_verification_started_at"),

  archived_at: timestamp("archived_at"),
  archived_reason: text("archived_reason"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
}));
