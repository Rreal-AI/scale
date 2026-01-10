"use client";

import { useState } from "react";
import { useModifiers } from "@/hooks/use-modifiers";
import { useModifierSelection } from "@/hooks/use-modifier-selection";
import { ModifiersFilters } from "./modifiers-filters";
import { ModifiersTableContent } from "./modifiers-table-content";
import { ModifiersPagination } from "./modifiers-pagination";
import { ModifierDialog } from "./modifier-dialog";
import { DeleteModifierDialog } from "./delete-modifier-dialog";
import { ModifierDetailSheet } from "./modifier-detail-sheet";
import { ImportModifiersDialog } from "./import-modifiers-dialog";
import { ModifierBulkActionsToolbar } from "./modifier-bulk-actions-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, CheckSquare } from "lucide-react";
import { toast } from "sonner";

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

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const { data, isLoading, error } = useModifiers({
    page: currentPage,
    limit: pageSize,
    ...filters,
  });

  // Get modifiers array for selection hook
  const modifiers = data?.modifiers ?? [];

  // Selection hook
  const {
    selectedModifierIds,
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
  } = useModifierSelection(modifiers);

  // Build current filters for global selection
  const currentFilters = {
    search: filters.search || undefined,
  };

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/modifiers/export");
      if (!response.ok) {
        throw new Error("Failed to export modifiers");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "modifiers.csv";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Modifiers exportados correctamente");
    } catch (error) {
      console.error("Error exporting modifiers:", error);
      toast.error("Error al exportar modifiers");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modifiers</h1>
          <p className="text-muted-foreground">Manage your product modifiers</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={() => {
              if (selectionMode) {
                deselectAll();
              }
              setSelectionMode(!selectionMode);
            }}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {selectionMode ? "Cancel" : "Select"}
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button variant="outline" onClick={handleCreateModifier}>
            <Plus className="h-4 w-4 mr-2" />
            New Modifier
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ModifiersFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Select All when in selection mode */}
      {selectionMode && modifiers.length > 0 && (
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
            Select all ({modifiers.length} visible)
          </span>

          {/* Link to select ALL modifiers in database */}
          {data?.pagination.total_count && data.pagination.total_count > modifiers.length && !isSelectAllGlobal && (
            <button
              onClick={() => selectAllGlobal(currentFilters, data.pagination.total_count)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Select all {data.pagination.total_count} modifiers
            </button>
          )}

          {/* Badge when global selection is active */}
          {isSelectAllGlobal && (
            <Badge variant="default" className="bg-blue-600 text-white">
              All {selectedCount} modifiers selected
            </Badge>
          )}

          {selectedCount > 0 && !isSelectAllGlobal && (
            <Badge variant="secondary" className="ml-auto">
              {selectedCount} selected
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <ModifiersTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onEditModifier={handleEditModifier}
        onDeleteModifier={handleDeleteModifier}
        onViewModifier={handleViewModifier}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelection={toggleSelection}
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

      <ImportModifiersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Bulk Actions Toolbar */}
      <ModifierBulkActionsToolbar
        selectedCount={selectedCount}
        selectedModifierIds={selectedModifierIds}
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










