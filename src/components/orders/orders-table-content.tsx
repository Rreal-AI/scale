"use client";

import { Eye } from "lucide-react";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    archived_from?: string;
    archived_to?: string;
    sort_by: string;
    sort_order: string;
  };
}

interface OrdersTableContentProps {
  data?: OrdersResponse;
  isLoading: boolean;
  error: Error | null;
  currentFilters: {
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
    type?: "delivery" | "takeout";
    sort_by?:
      | "created_at"
      | "updated_at"
      | "customer_name"
      | "check_number"
      | "total_amount"
      | "status"
      | "type";
    sort_order?: "asc" | "desc";
  };
  onViewOrder?: (order: Order) => void;
}

const statusLabels = {
  pending_weight: "Pending Weight",
  weighed: "Weighed",
  completed: "Dispatched",
  cancelled: "Cancelled",
  archived: "Archived",
};

const statusColors = {
  pending_weight: "default" as const,
  weighed: "secondary" as const,
  completed: "outline" as const,
  cancelled: "destructive" as const,
  archived: "outline" as const,
};

const typeLabels = {
  delivery: "Delivery",
  takeout: "Takeout",
};

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[180px]" />
            </div>
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-6 w-[100px] rounded-full" />
              <Skeleton className="h-4 w-[80px] rounded-full" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-[80px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-[90px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[100px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function OrdersTableContent({
  data,
  isLoading,
  error,
  currentFilters,
  onViewOrder,
}: OrdersTableContentProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading orders: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Check & Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <LoadingSkeleton />
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.orders.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Check & Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="text-muted-foreground">
                  {currentFilters.search ? (
                    <>
                      No orders found matching &ldquo;{currentFilters.search}
                      &rdquo;
                    </>
                  ) : (
                    <>No orders found</>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Check & Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{order.customer_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {order.customer_email && <div>{order.customer_email}</div>}
                    {order.customer_phone && <div>{order.customer_phone}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-mono text-sm">#{order.check_number}</div>
                  <div className="flex flex-col gap-1">
                    <Badge variant={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                    {order.status === "archived" && order.archived_at && (
                      <div className="text-xs text-muted-foreground" title={order.archived_reason || ""}>
                        📦 {new Date(order.archived_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{typeLabels[order.type]}</Badge>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {formatPrice(order.total_amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subtotal: {formatPrice(order.subtotal_amount)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatRelativeTime(order.created_at)}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onViewOrder?.(order)}
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View order details</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
