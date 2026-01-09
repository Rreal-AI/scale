"use client";

import { useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useOrderSelection } from "@/hooks/use-order-selection";
import { OrdersFilters } from "./orders-filters";
import { OrdersTableContent } from "./orders-table-content";
import { OrdersPagination } from "./orders-pagination";
import { OrderDetailSheet } from "./order-detail-sheet";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table, RefreshCw, CheckSquare, X } from "lucide-react";
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
  created_at: string;
  updated_at: string;
}

interface OrdersTableProps {
  viewMode?: "cards" | "table";
  onViewModeChange?: (mode: "cards" | "table") => void;
}

export function OrdersTable({ viewMode, onViewModeChange }: OrdersTableProps = {}) {
  const [filters, setFilters] = useState<{
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
    type?: "delivery" | "takeout";
    archived_from?: string;
    archived_to?: string;
    sort_by?:
      | "created_at"
      | "updated_at"
      | "customer_name"
      | "check_number"
      | "total_amount"
      | "status"
      | "type";
    sort_order?: "asc" | "desc";
  }>({
    sort_by: "created_at",
    sort_order: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sheet state
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    orderId: string | null;
  }>({
    open: false,
    orderId: null,
  });

  const { data, isLoading, error } = useOrders({
    page: currentPage,
    limit: pageSize,
    ...filters,
  });

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const {
    selectedIds,
    selectedOrderIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggleSelection,
    selectAll,
    deselectAll,
  } = useOrderSelection(data?.orders || []);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewOrder = (order: Order) => {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            View and manage customer orders
          </p>
        </div>
        
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

          {/* View Toggle */}
          {onViewModeChange && (
            <div className="flex items-center rounded-lg border p-1 bg-muted/50">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("cards")}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  viewMode === "cards" && "bg-background shadow-sm"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("table")}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  viewMode === "table" && "bg-background shadow-sm"
                )}
              >
                <Table className="h-4 w-4" />
                Table
              </Button>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <OrdersFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <OrdersTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onViewOrder={handleViewOrder}
        selectable={selectionMode}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        onToggleSelection={toggleSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
      />

      {/* Pagination */}
      {data && (
        <OrdersPagination
          currentPage={currentPage}
          totalPages={data.pagination.total_pages}
          totalCount={data.pagination.total_count}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          hasNextPage={data.pagination.has_next_page}
          hasPreviousPage={data.pagination.has_previous_page}
        />
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
      />
    </div>
  );
}
