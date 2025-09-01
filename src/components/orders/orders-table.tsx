"use client";

import { useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { OrdersFilters } from "./orders-filters";
import { OrdersTableContent } from "./orders-table-content";
import { OrdersPagination } from "./orders-pagination";
import { OrderDetailSheet } from "./order-detail-sheet";

interface Order {
  id: string;
  org_id: string;
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

export function OrdersTable() {
  const [filters, setFilters] = useState<{
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            View and manage customer orders
          </p>
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
    </div>
  );
}
