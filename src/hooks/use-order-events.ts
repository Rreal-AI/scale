import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export type OrderEventType =
  | "created"
  | "weight_verified"
  | "visual_verified"
  | "status_changed"
  | "archived"
  | "unarchived";

interface OrderEvent {
  id: string;
  order_id: string;
  org_id: string;
  event_type: OrderEventType;
  event_data: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string;
  order: {
    check_number: string;
    customer_name: string;
    status: string;
  };
}

interface OrderEventsResponse {
  events: OrderEvent[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

interface GetOrderEventsParams {
  page?: number;
  limit?: number;
  search?: string;
  event_type?: OrderEventType;
  date_from?: string;
  date_to?: string;
  order_id?: string;
}

const fetchOrderEvents = async (
  params: GetOrderEventsParams = {}
): Promise<OrderEventsResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.event_type) searchParams.set("event_type", params.event_type);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.order_id) searchParams.set("order_id", params.order_id);

  const response = await fetch(`/api/order-events?${searchParams}`);

  if (!response.ok) {
    throw new Error("Failed to fetch order events");
  }

  return response.json();
};

export const useOrderEvents = (params: GetOrderEventsParams = {}) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["order-events", orgId, params],
    queryFn: () => fetchOrderEvents(params),
    enabled: !!orgId,
  });
};

export const useOrderEventsByOrderId = (orderId: string | null) => {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["order-events", orgId, "order", orderId],
    queryFn: () => fetchOrderEvents({ order_id: orderId!, limit: 100 }),
    enabled: !!orgId && !!orderId,
  });
};
