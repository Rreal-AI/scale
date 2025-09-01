import { z } from "zod";

// Schema para crear un producto (API - expects cents)
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  price: z.number().int().positive("Price must be a positive integer"),
  weight: z.number().int().positive("Weight must be a positive integer"),
});

// Schema para crear un producto (Frontend - accepts float)
export const createProductFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters"),
  price: z.number().positive("Price must be a positive number"),
  weight: z.number().int().positive("Weight must be a positive integer"),
});

// Schema para actualizar un producto (API - expects cents)
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  price: z
    .number()
    .int()
    .positive("Price must be a positive integer")
    .optional(),
  weight: z
    .number()
    .int()
    .positive("Weight must be a positive integer")
    .optional(),
});

// Schema para actualizar un producto (Frontend - accepts float)
export const updateProductFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  weight: z
    .number()
    .int()
    .positive("Weight must be a positive integer")
    .optional(),
});

// Schema para filtros de búsqueda
export const getProductsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().optional(),
  sort_by: z
    .enum(["name", "price", "weight", "created_at"])
    .catch("created_at"),
  sort_order: z.enum(["asc", "desc"]).catch("desc"),
});

// Schema para validar ID de producto
export const productIdSchema = z.object({
  id: z.string().uuid("ID de producto inválido"),
});

// Tipos TypeScript derivados de los schemas
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductFormInput = z.infer<typeof createProductFormSchema>;
export type UpdateProductFormInput = z.infer<typeof updateProductFormSchema>;
export type GetProductsInput = z.infer<typeof getProductsSchema>;
export type ProductIdInput = z.infer<typeof productIdSchema>;
