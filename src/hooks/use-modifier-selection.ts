"use client";

import { useState, useCallback, useMemo } from "react";

export interface ModifierFilterParams {
  search?: string;
}

export type ModifierBulkDeleteParams =
  | { modifier_ids: string[] }
  | { select_all: true; filters?: ModifierFilterParams };

export function useModifierSelection<T extends { id: string }>(modifiers: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllGlobal, setIsSelectAllGlobal] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<ModifierFilterParams | null>(null);
  const [globalTotalCount, setGlobalTotalCount] = useState(0);

  const toggleSelection = useCallback((modifierId: string) => {
    // If in global mode, switching to individual mode
    if (isSelectAllGlobal) {
      setIsSelectAllGlobal(false);
      setGlobalFilters(null);
      setGlobalTotalCount(0);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(modifierId)) {
        next.delete(modifierId);
      } else {
        next.add(modifierId);
      }
      return next;
    });
  }, [isSelectAllGlobal]);

  const selectAll = useCallback(() => {
    // Select all visible modifiers (not global)
    setIsSelectAllGlobal(false);
    setGlobalFilters(null);
    setGlobalTotalCount(0);
    setSelectedIds(new Set(modifiers.map((m) => m.id)));
  }, [modifiers]);

  const selectAllGlobal = useCallback((filters: ModifierFilterParams, totalCount: number) => {
    // Select ALL modifiers matching filters (global mode)
    setIsSelectAllGlobal(true);
    setGlobalFilters(filters);
    setGlobalTotalCount(totalCount);
    // Also visually select all visible modifiers
    setSelectedIds(new Set(modifiers.map((m) => m.id)));
  }, [modifiers]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectAllGlobal(false);
    setGlobalFilters(null);
    setGlobalTotalCount(0);
  }, []);

  const isSelected = useCallback(
    (modifierId: string) => selectedIds.has(modifierId),
    [selectedIds]
  );

  const isAllSelected = useMemo(
    () => modifiers.length > 0 && selectedIds.size === modifiers.length,
    [modifiers.length, selectedIds.size]
  );

  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < modifiers.length,
    [modifiers.length, selectedIds.size]
  );

  // When global mode is active, show global count; otherwise show selected count
  const selectedCount = isSelectAllGlobal ? globalTotalCount : selectedIds.size;

  const selectedModifierIds = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  // Returns the correct params for bulk delete API
  const getBulkDeleteParams = useCallback((): ModifierBulkDeleteParams => {
    if (isSelectAllGlobal) {
      return {
        select_all: true,
        filters: globalFilters || undefined,
      };
    }
    return { modifier_ids: Array.from(selectedIds) };
  }, [isSelectAllGlobal, globalFilters, selectedIds]);

  return {
    selectedIds,
    selectedModifierIds,
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
