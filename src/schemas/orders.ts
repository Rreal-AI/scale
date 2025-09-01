import { z } from "zod";

// Schema para filtros de búsqueda de orders
export const getOrdersSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().optional(), // búsqueda por customer_name, check_number, customer_email
  status: z
    .enum(["pending_weight", "weighed", "completed", "cancelled"])
    .optional(),
  type: z.enum(["delivery", "takeout"]).optional(),
  sort_by: z
    .enum([
      "created_at",
      "updated_at",
      "customer_name",
      "check_number",
      "total_amount",
      "status",
      "type",
    ])
    .catch("created_at"),
  sort_order: z.enum(["asc", "desc"]).catch("desc"),
});

// Schema para validar ID de order
export const orderIdSchema = z.object({
  id: z.string().uuid("ID de order inválido"),
});

// Tipos TypeScript derivados de los schemas
export type GetOrdersInput = z.infer<typeof getOrdersSchema>;
export type OrderIdInput = z.infer<typeof orderIdSchema>;
