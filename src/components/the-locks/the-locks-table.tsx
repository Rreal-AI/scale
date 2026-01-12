"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { EventBadge } from "./event-badge";
import { OrderEventType } from "@/hooks/use-order-events";

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

interface TheLocksTableProps {
  data?: {
    events: OrderEvent[];
    pagination: {
      page: number;
      limit: number;
      total_count: number;
      total_pages: number;
      has_next_page: boolean;
      has_previous_page: boolean;
    };
  };
  isLoading: boolean;
  error: Error | null;
  onViewOrderHistory: (orderId: string, checkNumber: string) => void;
}

function formatEventDetails(
  eventType: OrderEventType,
  eventData: Record<string, unknown> | null
): string {
  if (!eventData) return "-";

  switch (eventType) {
    case "created":
      return `${eventData.items_count} items, ${eventData.expected_weight}g expected`;
    case "weight_verified":
      const delta = eventData.delta_weight as number;
      const deltaStr = delta >= 0 ? `+${delta}g` : `${delta}g`;
      const reweighStr = eventData.is_reweigh ? " (re-weigh)" : "";
      return `${eventData.actual_weight}g actual, ${deltaStr}${reweighStr}`;
    case "visual_verified":
      const confidence = eventData.confidence as number;
      const status = eventData.status as string;
      const missingItems = eventData.missing_items as string[];
      if (missingItems && missingItems.length > 0) {
        return `${status} (${confidence}%) - Missing: ${missingItems.join(", ")}`;
      }
      return `${status} (${confidence}% confidence)`;
    case "status_changed":
      return `${eventData.from_status} -> ${eventData.to_status}`;
    case "archived":
      const autoArchived = eventData.auto_archived as boolean;
      return autoArchived ? "Auto-archived (inactivity)" : "Manually archived";
    case "unarchived":
      return `Restored to ${eventData.restored_to_status}`;
    default:
      return JSON.stringify(eventData);
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TheLocksTable({
  data,
  isLoading,
  error,
  onViewOrderHistory,
}: TheLocksTableProps) {
  if (error) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-destructive">Error loading events: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Timestamp</TableHead>
            <TableHead className="w-[100px]">Check #</TableHead>
            <TableHead className="w-[140px]">Event</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[100px]">Actor</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))
          ) : data?.events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No events found
              </TableCell>
            </TableRow>
          ) : (
            data?.events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-sm">
                  {formatTimestamp(event.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium"
                    onClick={() =>
                      onViewOrderHistory(event.order_id, event.order.check_number)
                    }
                  >
                    {event.order.check_number}
                  </Button>
                </TableCell>
                <TableCell>
                  <EventBadge type={event.event_type} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                  {formatEventDetails(event.event_type, event.event_data)}
                </TableCell>
                <TableCell className="text-sm">
                  {event.actor_id ? "User" : "System"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onViewOrderHistory(event.order_id, event.order.check_number)
                    }
                    title="View order history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
