import { db } from "@/db";
import { orderEvents, NewOrderEvent } from "@/db/schema";

type EventType =
  | "created"
  | "weight_verified"
  | "visual_verified"
  | "status_changed"
  | "archived"
  | "unarchived";

interface CreateOrderEventParams {
  order_id: string;
  org_id: string;
  event_type: EventType;
  event_data?: Record<string, unknown>;
  actor_id?: string | null;
}

export async function createOrderEvent(params: CreateOrderEventParams) {
  const [event] = await db
    .insert(orderEvents)
    .values({
      order_id: params.order_id,
      org_id: params.org_id,
      event_type: params.event_type,
      event_data: params.event_data || null,
      actor_id: params.actor_id || null,
    } as NewOrderEvent)
    .returning();

  return event;
}
