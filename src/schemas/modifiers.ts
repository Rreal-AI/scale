import { z } from "zod";

// Schema para crear un modifier
export const createModifierSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  price: z
    .number()
    .int()
    .nonnegative("El precio debe ser un número entero no negativo"),
  weight: z
    .number()
    .int(
      "El peso debe ser un número entero (puede ser negativo para remover ingredientes)"
    ),
});

// Schema para actualizar un modifier
export const updateModifierSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .optional(),
  price: z
    .number()
    .int()
    .nonnegative("El precio debe ser un número entero no negativo")
    .optional(),
  weight: z
    .number()
    .int(
      "El peso debe ser un número entero (puede ser negativo para remover ingredientes)"
    )
    .optional(),
});

// Schema para filtros de búsqueda de modifiers
export const getModifiersSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().optional(),
  sort_by: z
    .enum(["name", "price", "weight", "created_at"])
    .catch("created_at"),
  sort_order: z.enum(["asc", "desc"]).catch("desc"),
});

// Schema para validar ID de modifier
export const modifierIdSchema = z.object({
  id: z.string().uuid("ID de modifier inválido"),
});

// Tipos TypeScript derivados de los schemas
export type CreateModifierInput = z.infer<typeof createModifierSchema>;
export type UpdateModifierInput = z.infer<typeof updateModifierSchema>;
export type GetModifiersInput = z.infer<typeof getModifiersSchema>;
export type ModifierIdInput = z.infer<typeof modifierIdSchema>;
