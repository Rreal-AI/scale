"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useOrderEvents, OrderEventType } from "@/hooks/use-order-events";
import { TheLocksFilters } from "./the-locks-filters";
import { TheLocksTable } from "./the-locks-table";
import { TheLocksPagination } from "./the-locks-pagination";
import { OrderEventsSheet } from "./order-events-sheet";

export function TheLocksView() {
  const [filters, setFilters] = useState<{
    search?: string;
    event_type?: OrderEventType;
    date_from?: string;
    date_to?: string;
  }>({});

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [orderSheet, setOrderSheet] = useState<{
    open: boolean;
    orderId: string | null;
    checkNumber: string | null;
  }>({ open: false, orderId: null, checkNumber: null });

  const { data, isLoading, error } = useOrderEvents({
    page: currentPage,
    limit: pageSize,
    ...filters,
  });

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleViewOrderHistory = (orderId: string, checkNumber: string) => {
    setOrderSheet({ open: true, orderId, checkNumber });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">The Locks</h1>
          <p className="text-muted-foreground">
            Audit trail and traceability for all order events
          </p>
        </div>
      </div>

      {/* Filters */}
      <TheLocksFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <TheLocksTable
        data={data}
        isLoading={isLoading}
        error={error}
        onViewOrderHistory={handleViewOrderHistory}
      />

      {/* Pagination */}
      {data && data.pagination.total_count > 0 && (
        <TheLocksPagination
          currentPage={currentPage}
          totalPages={data.pagination.total_pages}
          totalCount={data.pagination.total_count}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          hasNextPage={data.pagination.has_next_page}
          hasPreviousPage={data.pagination.has_previous_page}
        />
      )}

      {/* Order Events Sheet */}
      <OrderEventsSheet
        open={orderSheet.open}
        onOpenChange={(open) => setOrderSheet({ ...orderSheet, open })}
        orderId={orderSheet.orderId}
        checkNumber={orderSheet.checkNumber}
      />
    </div>
  );
}
