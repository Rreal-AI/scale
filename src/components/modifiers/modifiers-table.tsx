"use client";

import { useState } from "react";
import { useModifiers } from "@/hooks/use-modifiers";
import { ModifiersFilters } from "./modifiers-filters";
import { ModifiersTableContent } from "./modifiers-table-content";
import { ModifiersPagination } from "./modifiers-pagination";
import { ModifierDialog } from "./modifier-dialog";
import { DeleteModifierDialog } from "./delete-modifier-dialog";
import { ModifierDetailSheet } from "./modifier-detail-sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Modifier {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export function ModifiersTable() {
  const [filters, setFilters] = useState<{
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  }>({
    sort_by: "created_at",
    sort_order: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog and sheet states
  const [modifierDialog, setModifierDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    modifier?: Modifier | null;
  }>({
    open: false,
    mode: "create",
    modifier: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    modifier: Modifier | null;
  }>({
    open: false,
    modifier: null,
  });

  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    modifierId: string | null;
  }>({
    open: false,
    modifierId: null,
  });

  const { data, isLoading, error } = useModifiers({
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

  // CRUD action handlers
  const handleCreateModifier = () => {
    setModifierDialog({
      open: true,
      mode: "create",
      modifier: null,
    });
  };

  const handleEditModifier = (modifier: Modifier) => {
    setModifierDialog({
      open: true,
      mode: "edit",
      modifier,
    });
  };

  const handleDeleteModifier = (modifier: Modifier) => {
    setDeleteDialog({
      open: true,
      modifier,
    });
  };

  const handleViewModifier = (modifier: Modifier) => {
    setDetailSheet({
      open: true,
      modifierId: modifier.id,
    });
  };

  const handleModifierDialogClose = () => {
    setModifierDialog({
      open: false,
      mode: "create",
      modifier: null,
    });
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      open: false,
      modifier: null,
    });
  };

  const handleDetailSheetClose = () => {
    setDetailSheet({
      open: false,
      modifierId: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modifiers</h1>
          <p className="text-muted-foreground">Manage your product modifiers</p>
        </div>
        <Button onClick={handleCreateModifier}>
          <Plus className="h-4 w-4 mr-2" />
          New Modifier
        </Button>
      </div>

      {/* Filters */}
      <ModifiersFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <ModifiersTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onEditModifier={handleEditModifier}
        onDeleteModifier={handleDeleteModifier}
        onViewModifier={handleViewModifier}
      />

      {/* Pagination */}
      {data && (
        <ModifiersPagination
          currentPage={currentPage}
          totalPages={data.pagination.total_pages}
          totalCount={data.pagination.total_count}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          hasNextPage={data.pagination.has_next_page}
          hasPreviousPage={data.pagination.has_previous_page}
        />
      )}

      {/* Dialogs and Sheets */}
      <ModifierDialog
        open={modifierDialog.open}
        onOpenChange={handleModifierDialogClose}
        modifier={modifierDialog.modifier}
        mode={modifierDialog.mode}
      />

      <DeleteModifierDialog
        open={deleteDialog.open}
        onOpenChange={handleDeleteDialogClose}
        modifier={deleteDialog.modifier}
      />

      <ModifierDetailSheet
        open={detailSheet.open}
        onOpenChange={handleDetailSheetClose}
        modifierId={detailSheet.modifierId}
        onEdit={handleEditModifier}
        onDelete={handleDeleteModifier}
      />
    </div>
  );
}
