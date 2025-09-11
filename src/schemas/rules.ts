import { z } from "zod";

// Schema for rule conditions
export const ruleConditionSchema = z.object({
  id: z.string(),
  type: z.enum(["category_quantity", "total_items", "order_value", "product_quantity"]),
  operator: z.enum(["every", "greater_than", "equal_to", "less_than"]),
  value: z.number().min(1),
  category_id: z.string().optional(),
  product_id: z.string().optional(),
  description: z.string(),
});

// Schema for rule actions
export const ruleActionSchema = z.object({
  id: z.string(),
  type: z.enum(["add_product", "add_weight", "add_note"]),
  product_id: z.string().optional(),
  product_name: z.string().optional(),
  weight: z.number().min(0).optional(),
  quantity: z.number().min(1).optional(),
  note: z.string().optional(),
  description: z.string(),
});

// Main rule schemas
export const createRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  conditions: z.array(ruleConditionSchema).min(1, "At least one condition is required"),
  actions: z.array(ruleActionSchema).min(1, "At least one action is required"),
  is_active: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

export const updateRuleSchema = createRuleSchema.partial();

// Form schemas for UI
export const createRuleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  conditions: z.array(ruleConditionSchema).min(1, "At least one condition is required"),
  actions: z.array(ruleActionSchema).min(1, "At least one action is required"),
  is_active: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
});

export const updateRuleFormSchema = createRuleFormSchema.partial();

// API query schemas
export const getRulesParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort_by: z.enum(["name", "priority", "created_at", "updated_at"]).default("priority"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
  is_active: z.coerce.boolean().optional(),
});

export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;
export type CreateRule = z.infer<typeof createRuleSchema>;
export type UpdateRule = z.infer<typeof updateRuleSchema>;
export type CreateRuleForm = z.infer<typeof createRuleFormSchema>;
export type UpdateRuleForm = z.infer<typeof updateRuleFormSchema>;
export type GetRulesParams = z.infer<typeof getRulesParamsSchema>;