"use client";

import { Badge } from "@/components/ui/badge";
import { OrderEventType } from "@/hooks/use-order-events";

const eventTypeConfig: Record<
  OrderEventType,
  { label: string; className: string }
> = {
  created: {
    label: "Created",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  weight_verified: {
    label: "Weight Verified",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  visual_verified: {
    label: "Visual Verified",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  status_changed: {
    label: "Status Changed",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  unarchived: {
    label: "Unarchived",
    className: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  },
};

interface EventBadgeProps {
  type: OrderEventType;
}

export function EventBadge({ type }: EventBadgeProps) {
  const config = eventTypeConfig[type];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
