import { z } from "zod";

// Schema para crear un modifier (API - expects cents)
export const createModifierSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  price: z.number().int().nonnegative("Price must be a non-negative integer"),
  weight: z
    .number()
    .int("Weight must be an integer (can be negative to remove ingredients)"),
});

// Schema para crear un modifier (Frontend - accepts float)
export const createModifierFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  price: z.number().nonnegative("Price must be a non-negative number"),
  weight: z
    .number()
    .int("Weight must be an integer (can be negative to remove ingredients)"),
});

// Schema para actualizar un modifier (API - expects cents)
export const updateModifierSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  price: z
    .number()
    .int()
    .nonnegative("Price must be a non-negative integer")
    .optional(),
  weight: z
    .number()
    .int("Weight must be an integer (can be negative to remove ingredients)")
    .optional(),
});

// Schema para actualizar un modifier (Frontend - accepts float)
export const updateModifierFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  price: z
    .number()
    .nonnegative("Price must be a non-negative number")
    .optional(),
  weight: z
    .number()
    .int("Weight must be an integer (can be negative to remove ingredients)")
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
export type CreateModifierFormInput = z.infer<typeof createModifierFormSchema>;
export type UpdateModifierFormInput = z.infer<typeof updateModifierFormSchema>;
export type GetModifiersInput = z.infer<typeof getModifiersSchema>;
export type ModifierIdInput = z.infer<typeof modifierIdSchema>;
