"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Timer, 
  Scale, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled";
  type: "delivery" | "takeout";
  created_at: string;
  total_amount: number;
}

interface OrdersStatsProps {
  orders: Order[];
  className?: string;
}

export function OrdersStats({ orders, className }: OrdersStatsProps) {
  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending_weight").length,
    weighed: orders.filter(o => o.status === "weighed").length,
    completed: orders.filter(o => o.status === "completed").length,
    urgent: orders.filter(order => {
      const created = new Date(order.created_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
      return diffMinutes >= 35; // Orders older than 35 minutes
    }).length,
    totalRevenue: orders
      .filter(o => o.status === "completed")
      .reduce((sum, order) => sum + order.total_amount, 0)
  };

  const statCards = [
    {
      label: "Pending Weight",
      value: stats.pending,
      description: "Awaiting verification"
    },
    {
      label: "Urgent Orders",
      value: stats.urgent,
      description: "Need immediate attention",
      urgent: true
    },
    {
      label: "Weighed",
      value: stats.weighed,
      description: "Ready for delivery"
    },
    {
      label: "Completed",
      value: stats.completed,
      description: "Successfully delivered"
    }
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {statCards.map((stat) => {
        return (
          <Card 
            key={stat.label}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-md bg-white border-gray-200",
              stat.urgent && stat.value > 0 && "ring-1 ring-red-200"
            )}
          >
            {stat.urgent && stat.value > 0 && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-400" />
            )}
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  {stat.urgent && stat.value > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-red-600 border-red-200 bg-red-50">
                      URGENT
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}