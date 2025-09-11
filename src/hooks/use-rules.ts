import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateRule, UpdateRule, GetRulesParams } from "@/schemas/rules";

// Types
export interface Rule {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  conditions: Array<{
    id: string;
    type: "category_quantity" | "total_items" | "order_value" | "product_quantity";
    operator: "every" | "greater_than" | "equal_to" | "less_than";
    value: number;
    category_id?: string;
    product_id?: string;
    description: string;
  }>;
  actions: Array<{
    id: string;
    type: "add_product" | "add_weight" | "add_note";
    product_id?: string;
    product_name?: string;
    weight?: number;
    quantity?: number;
    note?: string;
    description: string;
  }>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface RulesResponse {
  rules: Rule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// API functions
const fetchRules = async (params: Partial<GetRulesParams>): Promise<RulesResponse> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/rules?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch rules");
  }
  return response.json();
};

const fetchRule = async (id: string): Promise<Rule> => {
  const response = await fetch(`/api/rules/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch rule");
  }
  return response.json();
};

const createRule = async (data: CreateRule): Promise<Rule> => {
  const response = await fetch("/api/rules", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create rule");
  }

  return response.json();
};

const updateRule = async ({ id, ...data }: UpdateRule & { id: string }): Promise<Rule> => {
  const response = await fetch(`/api/rules/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update rule");
  }

  return response.json();
};

const deleteRule = async (id: string): Promise<void> => {
  const response = await fetch(`/api/rules/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete rule");
  }
};

// Hooks
export function useRules(params: Partial<GetRulesParams> = {}) {
  return useQuery({
    queryKey: ["rules", params],
    queryFn: () => fetchRules(params),
  });
}

export function useRule(id: string) {
  return useQuery({
    queryKey: ["rule", id],
    queryFn: () => fetchRule(id),
    enabled: !!id,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["rule", data.id] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}