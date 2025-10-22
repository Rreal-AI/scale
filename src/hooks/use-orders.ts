import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

// Tipos para las respuestas de la API
interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface Modifier {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface OrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  name: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  modifier: Modifier;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  quantity: number;
  total_price: number;
  created_at: string;
  updated_at: string;
  product: Product;
  modifiers: OrderItemModifier[];
}

interface Order {
  id: string;
  org_id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
  type: "delivery" | "takeout";
  check_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  expected_weight?: number;
  actual_weight?: number;
  delta_weight?: number;
  input: string;
  structured_output?: Record<string, unknown>;
  weight_verified_at?: string;
  archived_at?: string;
  archived_reason?: string;
  created_at: string;
  updated_at: string;
}

interface OrderWithRelations extends Order {
  items: OrderItem[];
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  filters: {
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
    type?: "delivery" | "takeout";
    sort_by: string;
    sort_order: string;
    archived_from?: string;
    archived_to?: string;
  };
}

interface OrderResponse {
  order: OrderWithRelations;
}

// Parámetros para las queries
interface GetOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
  type?: "delivery" | "takeout";
  archived_from?: string;
  archived_to?: string;
  sort_by?:
    | "created_at"
    | "updated_at"
    | "customer_name"
    | "check_number"
    | "total_amount"
    | "status"
    | "type";
  sort_order?: "asc" | "desc";
}

// Funciones para hacer las peticiones a la API
const fetchOrders = async (
  params: GetOrdersParams = {}
): Promise<OrdersResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.type) searchParams.set("type", params.type);
  if (params.archived_from) searchParams.set("archived_from", params.archived_from);
  if (params.archived_to) searchParams.set("archived_to", params.archived_to);
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);

  const response = await fetch(`/api/orders?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }

  return response.json();
};

const fetchOrder = async (id: string): Promise<OrderResponse> => {
  const response = await fetch(`/api/orders/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch order");
  }

  return response.json();
};

// Hooks de React Query (solo lectura)
export const useOrders = (params: GetOrdersParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["orders", orgId, params],
    queryFn: () => fetchOrders(params),
    enabled: !!orgId,
  });
};

export const useRealTimeOrders = (params: GetOrdersParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["orders", orgId, params],
    queryFn: () => fetchOrders(params),
    enabled: !!orgId,
    refetchInterval: 3000,
  });
};

export const useOrder = (id: string) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["orders", orgId, id],
    queryFn: () => fetchOrder(id),
    enabled: !!orgId && !!id,
  });
};

// Hook para obtener orders por status (helper útil)
export const useOrdersByStatus = (
  status: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived",
  params: Omit<GetOrdersParams, "status"> = {}
) => {
  return useOrders({ ...params, status });
};

// Hook para obtener orders por tipo (helper útil)
export const useOrdersByType = (
  type: "delivery" | "takeout",
  params: Omit<GetOrdersParams, "type"> = {}
) => {
  return useOrders({ ...params, type });
};

// Hook para obtener orders recientes (helper útil)
export const useRecentOrders = (limit: number = 10) => {
  return useOrders({
    limit,
    sort_by: "created_at",
    sort_order: "desc",
  });
};

// Function to update order weight
const updateOrderWeight = async ({
  id,
  actual_weight,
  status,
}: {
  id: string;
  actual_weight: number;
  status?: "weighed" | "completed";
}): Promise<{ order: Order; message: string }> => {
  const response = await fetch(`/api/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ actual_weight, status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update order weight");
  }

  return response.json();
};

// Hook to update order weight
export const useUpdateOrderWeight = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderWeight,
    onSuccess: (data, variables) => {
      // Invalidar la query del order específico
      queryClient.invalidateQueries({
        queryKey: ["orders", orgId, variables.id],
      });
      // Invalidar la lista de orders
      queryClient.invalidateQueries({
        queryKey: ["orders", orgId],
        exact: false,
      });
    },
  });
};

// Batch complete weighed orders
const batchCompleteOrders = async (ids: string[]) => {
  const response = await fetch(`/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to batch complete orders");
  }
  return response.json() as Promise<{ updated: Order[]; count: number }>;
};

export const useBatchCompleteOrders = () => {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchCompleteOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", orgId], exact: false });
    },
  });
};


