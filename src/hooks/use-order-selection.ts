"use client";

import { useState, useCallback, useMemo } from "react";

export interface FilterParams {
  search?: string;
  status?: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
  type?: "delivery" | "takeout";
}

export type BulkDeleteParams =
  | { order_ids: string[] }
  | { select_all: true; filters?: FilterParams };

export function useOrderSelection<T extends { id: string }>(orders: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllGlobal, setIsSelectAllGlobal] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<FilterParams | null>(null);
  const [globalTotalCount, setGlobalTotalCount] = useState(0);

  const toggleSelection = useCallback((orderId: string) => {
    // If in global mode, switching to individual mode
    if (isSelectAllGlobal) {
      setIsSelectAllGlobal(false);
      setGlobalFilters(null);
      setGlobalTotalCount(0);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, [isSelectAllGlobal]);

  const selectAll = useCallback(() => {
    // Select all visible orders (not global)
    setIsSelectAllGlobal(false);
    setGlobalFilters(null);
    setGlobalTotalCount(0);
    setSelectedIds(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const selectAllGlobal = useCallback((filters: FilterParams, totalCount: number) => {
    // Select ALL orders matching filters (global mode)
    setIsSelectAllGlobal(true);
    setGlobalFilters(filters);
    setGlobalTotalCount(totalCount);
    // Also visually select all visible orders
    setSelectedIds(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectAllGlobal(false);
    setGlobalFilters(null);
    setGlobalTotalCount(0);
  }, []);

  const isSelected = useCallback(
    (orderId: string) => selectedIds.has(orderId),
    [selectedIds]
  );

  const isAllSelected = useMemo(
    () => orders.length > 0 && selectedIds.size === orders.length,
    [orders.length, selectedIds.size]
  );

  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < orders.length,
    [orders.length, selectedIds.size]
  );

  // When global mode is active, show global count; otherwise show selected count
  const selectedCount = isSelectAllGlobal ? globalTotalCount : selectedIds.size;

  const selectedOrderIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  // Returns the correct params for bulk delete API
  const getBulkDeleteParams = useCallback((): BulkDeleteParams => {
    if (isSelectAllGlobal) {
      return {
        select_all: true,
        filters: globalFilters || undefined,
      };
    }
    return { order_ids: Array.from(selectedIds) };
  }, [isSelectAllGlobal, globalFilters, selectedIds]);

  return {
    selectedIds,
    selectedOrderIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    isSelectAllGlobal,
    globalFilters,
    globalTotalCount,
    toggleSelection,
    selectAll,
    selectAllGlobal,
    deselectAll,
    getBulkDeleteParams,
  };
}
