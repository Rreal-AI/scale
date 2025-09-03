"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
  modifiers?: Array<{
    name: string;
    total_price: number;
  }>;
}

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled";
  type: "delivery" | "takeout";
  check_number: string;
  customer_name: string;
  customer_address?: string;
  total_amount: number;
  expected_weight?: number;
  actual_weight?: number;
  created_at: string;
  items?: OrderItem[];
  structured_output?: {
    items?: Array<{
      name: string;
      quantity: number;
      modifiers?: Array<{
        name: string;
      }>;
    }>;
  };
}

interface OrderCardProps {
  order: Order;
  onWeigh?: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
  className?: string;
}

const getStatusConfig = (status: Order["status"]) => {
  switch (status) {
    case "pending_weight":
      return {
        label: "Awaiting Weight",
        variant: "secondary" as const,
        color: "text-amber-600 bg-amber-50"
      };
    case "weighed":
      return {
        label: "Weighed",
        variant: "outline" as const,
        color: "text-blue-600 bg-blue-50"
      };
    case "completed":
      return {
        label: "Completed",
        variant: "outline" as const,
        color: "text-green-600 bg-green-50"
      };
    case "cancelled":
      return {
        label: "Cancelled",
        variant: "outline" as const,
        color: "text-red-600 bg-red-50"
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

const getDueTime = (createdAt: string): { time: string; isUrgent: boolean } => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  
  // Simulate due times based on order age
  const estimatedDueMinutes = 45; // 45 minutes from creation
  const remainingMinutes = estimatedDueMinutes - diffMinutes;
  
  if (remainingMinutes <= 0) {
    return { time: "Overdue", isUrgent: true };
  } else if (remainingMinutes <= 10) {
    return { time: `${remainingMinutes}m`, isUrgent: true };
  } else {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return { 
      time: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, 
      isUrgent: false 
    };
  }
};

const getItemsPreview = (order: Order): string => {
  // Try to get items from structured_output first, then fallback to items
  const items = order.structured_output?.items || order.items;
  
  if (!items || items.length === 0) {
    return "No items";
  }

  return items
    .slice(0, 3) // Show max 3 items
    .map(item => {
      const modifiersText = item.modifiers && item.modifiers.length > 0 
        ? ` (+${item.modifiers.length})` 
        : "";
      return `${item.quantity}x ${item.name}${modifiersText}`;
    })
    .join(", ") + (items.length > 3 ? "..." : "");
};

export function OrderCard({ order, onWeigh, onViewDetails, className }: OrderCardProps) {
  const statusConfig = getStatusConfig(order.status);
  const typeConfig = getTypeConfig(order.type);
  const { time: dueTime, isUrgent } = getDueTime(order.created_at);
  const itemsPreview = getItemsPreview(order);

  const TypeIcon = typeConfig.icon;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border-gray-200",
        isUrgent && "ring-1 ring-red-200",
        className
      )}
    >
      {/* Urgent indicator */}
      {isUrgent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-400" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">#{order.check_number}</h3>
              {isUrgent && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {order.customer_name}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline"
              className="flex items-center gap-1.5 px-2 py-1 text-gray-600 border-gray-200"
            >
              <TypeIcon className="h-3 w-3" />
              {typeConfig.label}
            </Badge>
            
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isUrgent ? "text-red-500" : "text-gray-500"
            )}>
              <Clock className="h-3 w-3" />
              {dueTime}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Items Preview */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Items
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            {itemsPreview}
          </p>
        </div>

        {/* Address for delivery */}
        {order.type === "delivery" && order.customer_address && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Address
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {order.customer_address}
            </p>
          </div>
        )}

        {/* Order Total */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-500">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(order.total_amount)}
          </span>
        </div>

        {/* Weight Info */}
        {order.expected_weight && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Expected Weight</span>
            <span className="font-medium text-gray-700">{gramsToOunces(order.expected_weight)} oz</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2">
          <Badge 
            variant="outline"
            className={cn(
              "px-2 py-1 text-xs font-medium border",
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </Badge>
          
          <div className="text-xs text-gray-500">
            {formatRelativeTime(order.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {order.status === "pending_weight" && onWeigh && (
            <Button 
              onClick={() => onWeigh(order)}
              size="sm"
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
            >
              Weigh Order
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(order)}
              className={cn(
                "border-gray-200 text-gray-700 hover:bg-gray-50",
                order.status === "pending_weight" ? "flex-none px-3" : "flex-1"
              )}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}