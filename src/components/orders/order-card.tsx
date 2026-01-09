"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import { gramsToOunces } from "@/lib/weight-conversion";
import { 
  Clock, 
  MapPin, 
  Package, 
  Scale, 
  Truck,
  AlertTriangle,
  CheckCircle2,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface OrderCardProps {
  order: Order;
  onWeigh?: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
  onCardClick?: (order: Order) => void;
  variant?: "default" | "compact";
  className?: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (orderId: string) => void;
}

const getStatusConfig = (status: Order["status"]) => {
  switch (status) {
    case "pending_weight":
      return {
        label: "Awaiting Weight",
        variant: "secondary" as const,
        style: {
          color: "var(--color-warning)",
          backgroundColor: "var(--color-warning-tint)",
          borderColor: "var(--color-warning)"
        }
      };
    case "weighed":
      return {
        label: "Ready for Lockers",
        variant: "outline" as const,
        style: {
          color: "var(--color-success)",
          backgroundColor: "var(--color-success-tint)",
          borderColor: "var(--color-success)"
        }
      };
    case "completed":
      return {
        label: "Dispatched",
        variant: "outline" as const,
        style: {
          color: "var(--color-success)",
          backgroundColor: "var(--color-success-tint)",
          borderColor: "var(--color-success)"
        }
      };
    case "cancelled":
      return {
        label: "Cancelled",
        variant: "outline" as const,
        style: {
          color: "var(--color-neutral-dark)",
          backgroundColor: "var(--color-neutral)",
          borderColor: "var(--color-neutral-border)"
        }
      };
    case "archived":
      return {
        label: "Archived",
        variant: "outline" as const,
        style: {
          color: "var(--color-neutral-dark)",
          backgroundColor: "var(--color-neutral)",
          borderColor: "var(--color-neutral-border)"
        }
      };
  }
};

const getTypeConfig = (type: Order["type"]) => {
  switch (type) {
    case "delivery":
      return {
        label: "Delivery",
        icon: Truck
      };
    case "takeout":
      return {
        label: "Pickup",
        icon: Package
      };
  }
};

const getDueTime = (createdAt: string, status: string): { 
  time: string; 
  isUrgent: boolean; 
  originalDue?: string;
  overdueBy?: string;
} => {
  // Completed orders are never urgent
  if (status === "completed" || status === "weighed") {
    return { time: "Completed", isUrgent: false };
  }
  
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  
  // Simulate due times based on order age
  const estimatedDueMinutes = 45; // 45 minutes from creation
  const remainingMinutes = estimatedDueMinutes - diffMinutes;
  
  // Calculate original due time
  const originalDueTime = new Date(created.getTime() + estimatedDueMinutes * 60 * 1000);
  const originalDueFormatted = originalDueTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (remainingMinutes <= 0) {
    const overdueMinutes = Math.abs(remainingMinutes);
    const overdueBy = overdueMinutes < 60 
      ? `${overdueMinutes}m late`
      : `${Math.floor(overdueMinutes / 60)}h ${overdueMinutes % 60}m late`;
      
    return { 
      time: "Overdue", 
      isUrgent: true, 
      originalDue: originalDueFormatted,
      overdueBy
    };
  } else if (remainingMinutes <= 10) {
    return { 
      time: `${remainingMinutes}m`, 
      isUrgent: true,
      originalDue: originalDueFormatted
    };
  } else {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return { 
      time: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, 
      isUrgent: false,
      originalDue: originalDueFormatted
    };
  }
};

const getItemsPreview = (order: Order): { items: React.ReactNode; hasMore: boolean; moreCount: number } => {
  // Try to get items from structured_output first
  const structuredOutput = order.structured_output as { items?: Array<{ name: string; quantity: number; modifiers?: Array<{ name: string }> }> } | null;
  const items = structuredOutput?.items;
  
  if (!items || items.length === 0) {
    return {
      items: <span className="text-gray-500 italic">No items</span>,
      hasMore: false,
      moreCount: 0
    };
  }

  const displayItems = items.slice(0, 3); // Show max 3 items
  const hasMore = items.length > 3;
  const moreCount = items.length - 3;
  
  const itemsNode = (
    <div className="space-y-1">
      {displayItems.map((item, index) => {
        const modifiersText = item.modifiers && item.modifiers.length > 0 
          ? ` (+${item.modifiers.length})` 
          : "";
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">•</span>
            <span>{item.quantity}× {item.name}{modifiersText}</span>
          </div>
        );
      })}
    </div>
  );

  return {
    items: itemsNode,
    hasMore,
    moreCount
  };
};

export function OrderCard({ order, onWeigh, onViewDetails, onCardClick, variant = "default", className, selectable, isSelected, onSelectionChange }: OrderCardProps) {
  const statusConfig = getStatusConfig(order.status);
  const typeConfig = getTypeConfig(order.type);
  const { time: dueTime, isUrgent, originalDue, overdueBy } = getDueTime(order.created_at, order.status);
  const { items: itemsPreview, hasMore, moreCount } = getItemsPreview(order);

  const TypeIcon = typeConfig.icon;

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(order);
    } else if (order.status === "pending_weight" && onWeigh) {
      onWeigh(order);
    }
  };

  if (variant === "compact") {
    return (
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-200 hover:shadow-md bg-white cursor-pointer",
          // Urgent indicator only for pending orders
          isUrgent && order.status === "pending_weight" && "ring-1 ring-[var(--color-danger)]",
          className
        )}
        style={{
          // Status-based styling
          backgroundColor: (order.status === "completed" || order.status === "weighed") 
            ? "var(--color-success-tint)" 
            : "white",
          borderColor: (order.status === "completed" || order.status === "weighed")
            ? "var(--color-success)"
            : "var(--color-neutral-border)"
        }}
        onClick={handleCardClick}
      >
        {/* Status indicator bar */}
        {order.status === "completed" && (
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--color-success)" }} />
        )}
        {order.status === "weighed" && (
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--color-success)" }} />
        )}
        {isUrgent && order.status === "pending_weight" && (
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--color-danger)" }} />
        )}

        <CardContent className="p-4 flex flex-col min-h-[140px]">
          {/* Selection checkbox */}
          {selectable && (
            <div
              className="absolute top-2 left-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelectionChange?.(order.id)}
                className="bg-white border-gray-300"
              />
            </div>
          )}

          {/* Content area - flexible height */}
          <div className={cn("flex-1 space-y-1.5 min-h-0", selectable && "pl-6")}>
            {/* Header row with badges */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">#{order.check_number}</h3>
              <Badge 
                variant="outline"
                className="h-5 px-2 text-[10px] font-medium"
                style={{
                  color: order.type === "delivery" ? "var(--color-primary)" : "var(--color-secondary)",
                  backgroundColor: order.type === "delivery" ? "var(--color-primary-tint)" : "var(--color-secondary-tint)",
                  borderColor: order.type === "delivery" ? "var(--color-primary)" : "var(--color-secondary)"
                }}
              >
                {typeConfig.label}
              </Badge>
              {order.status === "weighed" && (
                <Badge
                  variant="outline"
                  className="h-5 px-2 text-[10px] font-medium"
                  style={{
                    color: "var(--color-success)",
                    backgroundColor: "var(--color-success-tint)",
                    borderColor: "var(--color-success)"
                  }}
                >
                  Ready for Lockers
                </Badge>
              )}
              {isUrgent && (
                <Badge 
                  variant="outline"
                  className="h-5 px-2 text-[10px] font-medium"
                  style={{
                    color: "var(--color-danger)",
                    backgroundColor: "var(--color-danger-tint)",
                    borderColor: "var(--color-danger)"
                  }}
                >
                  Overdue
                </Badge>
              )}
            </div>

            {/* Customer name */}
            <p className="text-xs text-gray-600 truncate">{order.customer_name}</p>
            
            {/* Items list - compact with overflow handling */}
            <div className="text-xs text-gray-500 space-y-0.5">
              {(() => {
                const structuredOutput = order.structured_output as { items?: Array<{ name: string; quantity: number }> } | null;
                const items = structuredOutput?.items;
                
                if (!items || items.length === 0) {
                  return <div className="italic">No items</div>;
                }
                
                return (
                  <>
                    {items.slice(0, 2).map((item, index) => (
                      <div key={index} className="truncate">{item.quantity}× {item.name}</div>
                    ))}
                    {items.length > 2 && (
                      <div className="text-gray-400">+{items.length - 2} more items</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Divider line */}
          <div className="border-t border-gray-100 mt-3 mb-2"></div>

          {/* Actions - fixed at bottom with proper spacing */}
          <div className="flex gap-2 shrink-0">
            {order.status === "pending_weight" && onWeigh && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onWeigh(order);
                }}
                size="sm"
                className="h-7 px-3 text-xs text-white"
                style={{
                  backgroundColor: "var(--color-primary)"
                }}
              >
                Weigh
              </Button>
            )}
            {order.status === "weighed" && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fetch(`/api/orders`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: [order.id] }),
                  }).catch(console.error);
                }}
                className="h-7 px-3 text-xs text-white"
                style={{
                  backgroundColor: "var(--color-success)"
                }}
              >
                Confirm Dispatch
              </Button>
            )}
            
            {onViewDetails && order.status === "completed" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
                className="h-7 px-3 text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Details
              </Button>
            )}
          </div>
          
          {/* Updated at */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            Updated {formatRelativeTime(order.updated_at)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white cursor-pointer",
        // Urgent indicator only for pending orders
        isUrgent && order.status === "pending_weight" && "ring-1 ring-[var(--color-danger)]",
        className
      )}
      style={{
        // Status-based styling
        backgroundColor: (order.status === "completed" || order.status === "weighed") 
          ? "var(--color-success-tint)" 
          : "white",
        borderColor: (order.status === "completed" || order.status === "weighed")
          ? "var(--color-success)"
          : "var(--color-neutral-border)"
      }}
      onClick={handleCardClick}
    >
      {/* Status indicator bar */}
      {order.status === "completed" && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--color-success)" }} />
      )}
      {order.status === "weighed" && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "var(--color-success)" }} />
      )}
      {isUrgent && order.status === "pending_weight" && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--color-danger)" }} />
      )}

      <CardHeader className="pb-3">
        {/* Selection checkbox */}
        {selectable && (
          <div
            className="absolute top-3 left-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectionChange?.(order.id)}
              className="bg-white border-gray-300"
            />
          </div>
        )}

        <div className={cn("flex items-start justify-between", selectable && "pl-8")}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-h3">#{order.check_number}</h3>
              {isUrgent && (
                <AlertTriangle className="h-4 w-4" style={{ color: "var(--color-danger)" }} />
              )}
            </div>
            <p className="text-body">
              {order.customer_name}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline"
              className="flex items-center gap-1.5 px-2 py-1"
              style={{
                color: order.type === "delivery" ? "var(--color-primary)" : "var(--color-secondary)",
                backgroundColor: order.type === "delivery" ? "var(--color-primary-tint)" : "var(--color-secondary-tint)",
                borderColor: order.type === "delivery" ? "var(--color-primary)" : "var(--color-secondary)"
              }}
            >
              <TypeIcon className="h-3 w-3" />
              {typeConfig.label}
            </Badge>
            
            {/* Due time - only show if overdue */}
            {isUrgent && (
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                <Clock className="h-3 w-3" />
                Overdue
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Items Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-h6">Items</div>
            {hasMore && (
              <span className="text-xs text-gray-500">+{moreCount} more</span>
            )}
          </div>
          <div className="text-body">
            {itemsPreview}
          </div>
        </div>


        {/* Order Total */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-label">Total</span>
          <span className="text-h3">
            {formatPrice(order.total_amount)}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2">
          <Badge 
            variant="outline"
            className="px-2 py-1 text-xs font-medium border"
            style={statusConfig.style}
          >
            {statusConfig.label}
          </Badge>
          
          <div className="text-caption">
            {formatRelativeTime(order.created_at)}
          </div>
        </div>

        {/* Actions - Fixed layout */}
        <div className="flex gap-2 pt-2">
          {order.status === "pending_weight" && onWeigh && (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onWeigh(order);
              }}
              size="sm"
              className="flex-1 text-white"
              style={{
                backgroundColor: "var(--color-primary)"
              }}
            >
              Weigh Order
            </Button>
          )}
          
          {onViewDetails && order.status === "completed" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(order);
              }}
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              View Details
            </Button>
          )}
        </div>
        
        {/* Updated at */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          Updated {formatRelativeTime(order.updated_at)}
        </div>
      </CardContent>
    </Card>
  );
}