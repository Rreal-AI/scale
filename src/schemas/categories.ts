import { z } from "zod";

// Schema para crear una categoría (API)
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

// Schema para crear una categoría (Frontend)
export const createCategoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

// Schema para actualizar una categoría (API)
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

// Schema para actualizar una categoría (Frontend)
export const updateCategoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

// Schema para filtros de búsqueda
export const getCategoriesSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().optional(),
  sort_by: z.enum(["name", "created_at"]).catch("created_at"),
  sort_order: z.enum(["asc", "desc"]).catch("desc"),
});

// Schema para validar ID de categoría
export const categoryIdSchema = z.object({
  id: z.string().uuid("ID de categoría inválido"),
});

// Tipos TypeScript derivados de los schemas
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateCategoryFormInput = z.infer<typeof createCategoryFormSchema>;
export type UpdateCategoryFormInput = z.infer<typeof updateCategoryFormSchema>;
export type GetCategoriesInput = z.infer<typeof getCategoriesSchema>;
export type CategoryIdInput = z.infer<typeof categoryIdSchema>;
