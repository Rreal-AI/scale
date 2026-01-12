"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderEventsByOrderId, OrderEventType } from "@/hooks/use-order-events";
import { EventBadge } from "./event-badge";

interface OrderEventsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  checkNumber: string | null;
}

function formatEventDetails(
  eventType: OrderEventType,
  eventData: Record<string, unknown> | null
): React.ReactNode {
  if (!eventData) return null;

  switch (eventType) {
    case "created":
      return (
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Items: {String(eventData.items_count)}</li>
          <li>Expected weight: {String(eventData.expected_weight)}g</li>
          <li>Type: {String(eventData.order_type)}</li>
        </ul>
      );
    case "weight_verified":
      const delta = eventData.delta_weight as number;
      return (
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Expected: {String(eventData.expected_weight)}g</li>
          <li>Actual: {String(eventData.actual_weight)}g</li>
          <li className={delta > 50 ? "text-red-600" : delta < -50 ? "text-orange-600" : ""}>
            Delta: {delta >= 0 ? "+" : ""}{String(delta)}g
          </li>
          {Boolean(eventData.is_reweigh) && (
            <li className="text-blue-600">
              Re-weigh (previous: {String(eventData.previous_actual_weight)}g)
            </li>
          )}
        </ul>
      );
    case "visual_verified":
      const missingItems = eventData.missing_items as string[];
      const extraItems = eventData.extra_items as string[];
      return (
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Status: {String(eventData.status)}</li>
          <li>Confidence: {String(eventData.confidence)}%</li>
          <li>Match: {eventData.match ? "Yes" : "No"}</li>
          {missingItems && missingItems.length > 0 && (
            <li className="text-red-600">Missing: {missingItems.join(", ")}</li>
          )}
          {extraItems && extraItems.length > 0 && (
            <li className="text-orange-600">Extra: {extraItems.join(", ")}</li>
          )}
        </ul>
      );
    case "status_changed":
      return (
        <p className="text-sm text-muted-foreground">
          {String(eventData.from_status)} -&gt; {String(eventData.to_status)}
        </p>
      );
    case "archived":
      return (
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>{eventData.auto_archived ? "Auto-archived" : "Manual archive"}</li>
          <li>Reason: {String(eventData.reason)}</li>
        </ul>
      );
    case "unarchived":
      return (
        <p className="text-sm text-muted-foreground">
          Restored to: {String(eventData.restored_to_status)}
        </p>
      );
    default:
      return (
        <pre className="text-xs text-muted-foreground">
          {JSON.stringify(eventData, null, 2)}
        </pre>
      );
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function OrderEventsSheet({
  open,
  onOpenChange,
  orderId,
  checkNumber,
}: OrderEventsSheetProps) {
  const { data, isLoading, error } = useOrderEventsByOrderId(orderId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order History</SheetTitle>
          <SheetDescription>
            Full event timeline for order #{checkNumber}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive">Error loading events: {error.message}</p>
          ) : data?.events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No events found for this order
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

              {/* Events */}
              <div className="space-y-6">
                {data?.events.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4 pl-6">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EventBadge type={event.event_type} />
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(event.created_at)}
                        </span>
                      </div>

                      {event.event_data && (
                        <div className="bg-muted/50 rounded-md p-3">
                          {formatEventDetails(event.event_type, event.event_data)}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        By: {event.actor_id ? "User" : "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
