"use client";

import { useState } from "react";
import { useRealTimeOrders, useUpdateOrderWeight } from "@/hooks/use-orders";
import { OrderCard } from "./order-card";
import { OrderDetailSheet } from "./order-detail-sheet";
import { OrdersStats } from "./orders-stats";
import { WeighOrderView } from "./weigh-order-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Truck, 
  Package, 
  RefreshCw,
  AlertTriangle,
  Timer,
  Scale,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled";
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
  created_at: string;
  updated_at: string;
}

interface FilterOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value?: "delivery" | "takeout";
  status?: "pending_weight" | "weighed" | "completed" | "cancelled";
  color: string;
  count?: number;
}

export function OrdersDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"delivery" | "takeout" | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"pending_weight" | "weighed" | "completed" | "cancelled" | "all">("all");
  
  // View states
  const [currentView, setCurrentView] = useState<"dashboard" | "weigh">("dashboard");
  const [weighOrderId, setWeighOrderId] = useState<string | null>(null);
  
  // Detail sheet state
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    orderId: string | null;
  }>({
    open: false,
    orderId: null,
  });

  // Fetch orders with real-time updates
  const { data, isLoading, error, refetch } = useRealTimeOrders({
    limit: 50, // Show more orders in card view
    search: searchQuery || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const orders = data?.orders || [];

  // Fetch all orders for accurate counts (without filters)
  const { data: allOrdersData } = useRealTimeOrders({
    limit: 1000, // Get all orders for counting
    sort_by: "created_at",
    sort_order: "desc",
  });

  // Calculate counts for filter badges
  const getCounts = () => {
    if (!allOrdersData) return {};
    
    const allOrders = allOrdersData.orders;
    return {
      all: allOrders.length,
      delivery: allOrders.filter(o => o.type === "delivery").length,
      takeout: allOrders.filter(o => o.type === "takeout").length,
      pending_weight: allOrders.filter(o => o.status === "pending_weight").length,
      weighed: allOrders.filter(o => o.status === "weighed").length,
      completed: allOrders.filter(o => o.status === "completed").length,
      cancelled: allOrders.filter(o => o.status === "cancelled").length,
    };
  };

  const counts = getCounts();

  const typeFilters: FilterOption[] = [
    {
      id: "all",
      label: "All Orders",
      icon: Filter,
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.all
    },
    {
      id: "delivery",
      label: "Delivery",
      icon: Truck,
      value: "delivery",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.delivery
    },
    {
      id: "takeout",
      label: "Pickup",
      icon: Package,
      value: "takeout",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.takeout
    }
  ];

  const statusFilters: FilterOption[] = [
    {
      id: "pending_weight",
      label: "Awaiting Weight",
      icon: Timer,
      status: "pending_weight",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.pending_weight
    },
    {
      id: "weighed",
      label: "Weighed",
      icon: Scale,
      status: "weighed",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.weighed
    },
    {
      id: "completed",
      label: "Completed",
      icon: CheckCircle2,
      status: "completed",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.completed
    },
    {
      id: "cancelled",
      label: "Cancelled",
      icon: AlertTriangle,
      status: "cancelled",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.cancelled
    }
  ];

  const handleWeighOrder = (order: Order) => {
    setWeighOrderId(order.id);
    setCurrentView("weigh");
  };

  const handleViewDetails = (order: Order) => {
    setDetailSheet({
      open: true,
      orderId: order.id,
    });
  };

  const handleDetailSheetClose = () => {
    setDetailSheet({
      open: false,
      orderId: null,
    });
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setWeighOrderId(null);
  };

  const updateOrderWeightMutation = useUpdateOrderWeight();

  const handleOrderWeighed = async (orderId: string, totalWeightInGrams: number) => {
    try {
      await updateOrderWeightMutation.mutateAsync({
        id: orderId,
        actual_weight: totalWeightInGrams,
      });
      // Orders will auto-refresh due to query invalidation
    } catch (error) {
      console.error("Error updating order weight:", error);
      // TODO: Show error toast
    }
  };

  // Get urgent orders count
  const urgentOrdersCount = orders.filter(order => {
    const created = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return diffMinutes >= 35; // Orders older than 35 minutes are urgent
  }).length;

  // Show weigh view if in weigh mode
  if (currentView === "weigh") {
    return (
      <WeighOrderView
        selectedOrderId={weighOrderId}
        onBack={handleBackToDashboard}
        onOrderSelect={setWeighOrderId}
        onOrderWeighed={handleOrderWeighed}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Orders Dashboard</h1>
            {urgentOrdersCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {urgentOrdersCount} Urgent
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Real-time order management and weight verification
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {orders.length > 0 && (
        <OrdersStats orders={orders} />
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type Filters */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Order Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {typeFilters.map((filter) => {
              const Icon = filter.icon;
              const isSelected = selectedType === (filter.value || "all");
              
              return (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(filter.value || "all")}
                  className={cn(
                    "flex items-center gap-2 transition-all border",
                    isSelected 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                  {filter.count !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-1 text-xs",
                        isSelected ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {filter.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Status Filters */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Order Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const Icon = filter.icon;
              const isSelected = selectedStatus === filter.status;
              
              return (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStatus(filter.status || "all")}
                  className={cn(
                    "flex items-center gap-2 transition-all border",
                    isSelected 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                  {filter.count !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-1 text-xs",
                        isSelected ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {filter.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading orders</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the orders. Please try again.
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedType !== "all" || selectedStatus !== "all"
              ? "Try adjusting your filters or search query."
              : "No orders have been created yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onWeigh={handleWeighOrder}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Pagination Info */}
      {data && data.pagination.total_count > 0 && (
        <div className="flex justify-center text-sm text-muted-foreground">
          Showing {orders.length} of {data.pagination.total_count} orders
        </div>
      )}

      {/* Detail Sheet */}
      <OrderDetailSheet
        open={detailSheet.open}
        onOpenChange={handleDetailSheetClose}
        orderId={detailSheet.orderId}
      />
    </div>
  );
}