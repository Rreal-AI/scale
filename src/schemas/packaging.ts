import { z } from "zod";

// Schema para crear un packaging (API)
export const createPackagingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  weight: z.number().int().positive("Weight must be a positive integer"),
  is_default: z.boolean().optional(),
});

// Schema para crear un packaging (Frontend)
export const createPackagingFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  weight: z.number().int().positive("Weight must be a positive integer"),
  is_default: z.boolean().optional(),
});

// Schema para actualizar un packaging (API)
export const updatePackagingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  weight: z
    .number()
    .int()
    .positive("Weight must be a positive integer")
    .optional(),
  is_default: z.boolean().optional(),
});

// Schema para actualizar un packaging (Frontend)
export const updatePackagingFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  weight: z
    .number()
    .int()
    .positive("Weight must be a positive integer")
    .optional(),
  is_default: z.boolean().optional(),
});

// Schema para filtros de búsqueda
export const getPackagingSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().optional(),
  sort_by: z.enum(["name", "weight", "created_at"]).catch("created_at"),
  sort_order: z.enum(["asc", "desc"]).catch("desc"),
});

// Schema para validar ID de packaging
export const packagingIdSchema = z.object({
  id: z.string().uuid("ID de packaging inválido"),
});

// Tipos TypeScript derivados de los schemas
export type CreatePackagingInput = z.infer<typeof createPackagingSchema>;
export type UpdatePackagingInput = z.infer<typeof updatePackagingSchema>;
export type CreatePackagingFormInput = z.infer<
  typeof createPackagingFormSchema
>;
export type UpdatePackagingFormInput = z.infer<
  typeof updatePackagingFormSchema
>;
export type GetPackagingInput = z.infer<typeof getPackagingSchema>;
export type PackagingIdInput = z.infer<typeof packagingIdSchema>;
