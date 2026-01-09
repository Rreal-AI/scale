"use client";

import { useEffect, useState } from "react";
import { useRealTimeOrders, useUpdateOrderWeight } from "@/hooks/use-orders";
import { useOrderSelection } from "@/hooks/use-order-selection";
import { OrderCard } from "./order-card";
import { OrderDetailSheet } from "./order-detail-sheet";
import { OrdersStats } from "./orders-stats";
import { WeighOrderView } from "./weigh-order-view";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  Truck,
  Package,
  RefreshCw,
  AlertTriangle,
  Timer,
  Scale,
  CheckCircle2,
  LayoutGrid,
  Table,
  Settings2,
  Archive,
  CheckSquare,
  X
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

interface FilterOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value?: "delivery" | "takeout";
  status?: "pending_weight" | "completed" | "cancelled" | "archived";
  color: string;
  count?: number;
}

interface OrdersDashboardProps {
  viewMode?: "cards" | "table";
  onViewModeChange?: (mode: "cards" | "table") => void;
}

export function OrdersDashboard({ viewMode, onViewModeChange }: OrdersDashboardProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"delivery" | "takeout" | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"pending_weight" | "completed" | "cancelled" | "archived" | "all">("all");
  const [showDispatched, setShowDispatched] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = localStorage.getItem("orders_show_dispatched");
      return v ? JSON.parse(v) : true;
    } catch {
      return true;
    }
  });
  
  const [showDashboard, setShowDashboard] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = localStorage.getItem("orders_show_dashboard");
      return v ? JSON.parse(v) : true;
    } catch {
      return true;
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem("orders_show_dispatched", JSON.stringify(showDispatched));
    } catch {}
  }, [showDispatched]);
  
  useEffect(() => {
    try {
      localStorage.setItem("orders_show_dashboard", JSON.stringify(showDashboard));
    } catch {}
  }, [showDashboard]);
  
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

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const {
    selectedOrderIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    isSelectAllGlobal,
    toggleSelection,
    selectAll,
    selectAllGlobal,
    deselectAll,
    getBulkDeleteParams,
  } = useOrderSelection(orders);

  // Build current filters for global selection
  const currentFilters = {
    search: searchQuery || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
  };

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
      completed: allOrders.filter(o => o.status === "completed").length,
      cancelled: allOrders.filter(o => o.status === "cancelled").length,
      archived: allOrders.filter(o => o.status === "archived").length,
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
      color: "text-indigo-600 hover:bg-indigo-50",
      count: counts.delivery
    },
    {
      id: "takeout",
      label: "Pickup",
      icon: Package,
      value: "takeout",
      color: "text-emerald-600 hover:bg-emerald-50",
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
      id: "completed",
      label: "Dispatched",
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
    },
    {
      id: "archived",
      label: "Archived",
      icon: Archive,
      status: "archived",
      color: "text-gray-700 hover:bg-gray-100",
      count: counts.archived
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

  const handleOrderWeighed = async (
    orderId: string,
    totalWeightInGrams: number,
    status: "weighed" | "completed" = "completed"
  ) => {
    try {
      await updateOrderWeightMutation.mutateAsync({
        id: orderId,
        actual_weight: totalWeightInGrams,
        status,
      });
      // Orders will auto-refresh due to query invalidation
    } catch (error) {
      console.error("Error updating order weight:", error);
      // TODO: Show error toast
    }
  };

  // Get urgent orders count (only pending orders can be urgent)
  const urgentOrdersCount = orders.filter(order => {
    if (order.status !== "pending_weight") return false; // Only pending orders can be urgent
    
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
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        
        <div className="flex items-center gap-2">
          {/* Select Mode Toggle */}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (selectionMode) {
                deselectAll();
              }
              setSelectionMode(!selectionMode);
            }}
            className={cn(
              "flex items-center gap-2",
              selectionMode && "bg-gray-900 text-white"
            )}
          >
            {selectionMode ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Select
              </>
            )}
          </Button>

          {/* Components Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Components
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium leading-none">Toggle Components</h4>
                  <p className="text-xs text-muted-foreground">
                    Show or hide dashboard components
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-dashboard"
                      checked={showDashboard}
                      onCheckedChange={(checked) => setShowDashboard(Boolean(checked))}
                    />
                    <label
                      htmlFor="show-dashboard"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Dashboard Stats
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-dispatched"
                      checked={showDispatched}
                      onCheckedChange={(checked) => setShowDispatched(Boolean(checked))}
                    />
                    <label
                      htmlFor="show-dispatched"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Dispatched Orders
                    </label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* View Toggle */}
          {onViewModeChange && (
            <div className="flex items-center rounded-lg border p-1 bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("cards")}
                className={cn(
                  "flex items-center gap-2 transition-all border",
                  viewMode === "cards" 
                    ? "border-black bg-gray-100 font-semibold text-black" 
                    : "border-transparent hover:bg-gray-50"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("table")}
                className={cn(
                  "flex items-center gap-2 transition-all border",
                  viewMode === "table" 
                    ? "border-black bg-gray-100 font-semibold text-black" 
                    : "border-transparent hover:bg-gray-50"
                )}
              >
                <Table className="h-4 w-4" />
                Table
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview - Conditionally show based on toggle */}
      {showDashboard && allOrdersData?.orders && allOrdersData.orders.length > 0 && (
        <OrdersStats orders={allOrdersData.orders} />
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

        {/* Type + Status Filters in one row with divider */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type Filters */}
          <div className="flex flex-wrap gap-2">
            {typeFilters.map((filter) => {
              const Icon = filter.icon;
              const isSelected = selectedType === (filter.value || "all");
              
              return (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Toggle filter - if already selected, deselect it
                    if (isSelected && filter.value) {
                      setSelectedType("all");
                    } else {
                      setSelectedType(filter.value || "all");
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 transition-all border",
                    isSelected 
                      ? (filter.id === "delivery" || filter.id === "takeout")
                          ? "text-white"
                          : "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                  style={isSelected && (filter.id === "delivery" || filter.id === "takeout") ? {
                    backgroundColor: filter.id === "delivery" ? "var(--color-primary)" : "var(--color-secondary)",
                    borderColor: filter.id === "delivery" ? "var(--color-primary)" : "var(--color-secondary)"
                  } : !isSelected && (filter.id === "delivery" || filter.id === "takeout") ? {
                    color: filter.id === "delivery" ? "var(--color-primary)" : "var(--color-secondary)",
                    borderColor: filter.id === "delivery" ? "var(--color-primary)" : "var(--color-secondary)",
                    backgroundColor: "transparent"
                  } : undefined}
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

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300" />

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const Icon = filter.icon;
              const isSelected = selectedStatus === filter.status;
              
              return (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Toggle filter - if already selected, deselect it
                    if (isSelected && filter.status) {
                      setSelectedStatus("all");
                    } else {
                      setSelectedStatus(filter.status || "all");
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 transition-all border",
                    isSelected 
                      ? (filter.status === "completed" || filter.status === "cancelled")
                          ? "text-white"
                          : "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                  style={isSelected && (filter.status === "completed" || filter.status === "cancelled") ? {
                    backgroundColor: filter.status === "completed" ? "var(--color-success)" : "var(--color-warning)",
                    borderColor: filter.status === "completed" ? "var(--color-success)" : "var(--color-warning)"
                  } : !isSelected && (filter.status === "completed" || filter.status === "cancelled") ? {
                    color: filter.status === "completed" ? "var(--color-success)" : "var(--color-warning)",
                    borderColor: filter.status === "completed" ? "var(--color-success)" : "var(--color-warning)",
                    backgroundColor: "transparent"
                  } : undefined}
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

      {/* Select All when in selection mode */}
      {selectionMode && orders.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md border">
          <Checkbox
            checked={isAllSelected || isSelectAllGlobal}
            ref={(el) => {
              if (el && !isSelectAllGlobal) {
                (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isSomeSelected || false;
              }
            }}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
          <span className="text-sm text-gray-600">
            Select all ({orders.length} visible)
          </span>

          {/* Link to select ALL orders in database */}
          {data?.pagination.total_count && data.pagination.total_count > orders.length && !isSelectAllGlobal && (
            <button
              onClick={() => selectAllGlobal(currentFilters, data.pagination.total_count)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Select all {data.pagination.total_count} orders
            </button>
          )}

          {/* Badge when global selection is active */}
          {isSelectAllGlobal && (
            <Badge variant="default" className="bg-blue-600 text-white">
              All {selectedCount} orders selected
            </Badge>
          )}

          {selectedCount > 0 && !isSelectAllGlobal && (
            <Badge variant="secondary" className="ml-auto">
              {selectedCount} selected
            </Badge>
          )}
        </div>
      )}

      {/* Orders Grid */}
      {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
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
        <div className="space-y-8">
          {(() => {
            // Separate orders by status when showing all
            const pendingOrders = orders.filter(order => 
              order.status === "pending_weight" || order.status === "weighed"
            );
            const completedOrders = orders.filter(order => 
              order.status === "completed"
            );
            
            // If filtering by status, show normal grid
            if (selectedStatus !== "all") {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      variant="compact"
                      onWeigh={handleWeighOrder}
                      onViewDetails={handleViewDetails}
                      onCardClick={selectionMode ? undefined : (order.status === "pending_weight" ? handleWeighOrder : handleViewDetails)}
                      selectable={selectionMode}
                      isSelected={isSelected(order.id)}
                      onSelectionChange={toggleSelection}
                    />
                  ))}
                </div>
              );
            }
            
            return (
              <div className="space-y-8">
                {/* Pending Orders Section */}
                {pendingOrders.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {pendingOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          variant="compact"
                          onWeigh={handleWeighOrder}
                          onViewDetails={handleViewDetails}
                          onCardClick={selectionMode ? undefined : handleWeighOrder}
                          selectable={selectionMode}
                          isSelected={isSelected(order.id)}
                          onSelectionChange={toggleSelection}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Dispatched Orders Section */}
                {completedOrders.length > 0 && (selectedStatus !== "all" || showDispatched) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider px-3">
                        Dispatched
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {completedOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          variant="compact"
                          onWeigh={handleWeighOrder}
                          onViewDetails={handleViewDetails}
                          onCardClick={selectionMode ? undefined : handleViewDetails}
                          selectable={selectionMode}
                          isSelected={isSelected(order.id)}
                          onSelectionChange={toggleSelection}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Empty state when no orders in either section */}
                {pendingOrders.length === 0 && completedOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || selectedType !== "all"
                        ? "Try adjusting your filters or search query."
                        : "No orders have been created yet."}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
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

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedCount}
        selectedOrderIds={selectedOrderIds}
        onDeselectAll={() => {
          deselectAll();
          setSelectionMode(false);
        }}
        isSelectAllGlobal={isSelectAllGlobal}
        getBulkDeleteParams={getBulkDeleteParams}
      />
    </div>
  );
}