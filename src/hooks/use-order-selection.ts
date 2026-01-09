"use client";

import { useState, useCallback, useMemo } from "react";

export function useOrderSelection<T extends { id: string }>(orders: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
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

  const selectedCount = selectedIds.size;

  const selectedOrderIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  return {
    selectedIds,
    selectedOrderIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggleSelection,
    selectAll,
    deselectAll,
  };
}
