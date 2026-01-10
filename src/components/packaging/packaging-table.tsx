"use client";

import { useState } from "react";
import { usePackaging } from "@/hooks/use-packaging";
import { PackagingFilters } from "./packaging-filters";
import { PackagingTableContent } from "./packaging-table-content";
import { PackagingPagination } from "./packaging-pagination";
import { PackagingDialog } from "./packaging-dialog";
import { DeletePackagingDialog } from "./delete-packaging-dialog";
import { PackagingDetailSheet } from "./packaging-detail-sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function PackagingTable() {
  const [filters, setFilters] = useState<{
    search?: string;
    sort_by?: "name" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  }>({
    sort_by: "created_at",
    sort_order: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog and sheet states
  const [packagingDialog, setPackagingDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    packaging?: Packaging | null;
  }>({
    open: false,
    mode: "create",
    packaging: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    packaging: Packaging | null;
  }>({
    open: false,
    packaging: null,
  });

  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    packagingId: string | null;
  }>({
    open: false,
    packagingId: null,
  });

  const { data, isLoading, error } = usePackaging({
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
  const handleCreatePackaging = () => {
    setPackagingDialog({
      open: true,
      mode: "create",
      packaging: null,
    });
  };

  const handleEditPackaging = (packaging: Packaging) => {
    setPackagingDialog({
      open: true,
      mode: "edit",
      packaging,
    });
  };

  const handleDeletePackaging = (packaging: Packaging) => {
    setDeleteDialog({
      open: true,
      packaging,
    });
  };

  const handleViewPackaging = (packaging: Packaging) => {
    setDetailSheet({
      open: true,
      packagingId: packaging.id,
    });
  };

  const handlePackagingDialogClose = () => {
    setPackagingDialog({
      open: false,
      mode: "create",
      packaging: null,
    });
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      open: false,
      packaging: null,
    });
  };

  const handleDetailSheetClose = () => {
    setDetailSheet({
      open: false,
      packagingId: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Packaging</h1>
          <p className="text-muted-foreground">Manage your packaging catalog</p>
        </div>
        <Button variant="outline" onClick={handleCreatePackaging}>
          <Plus className="h-4 w-4 mr-2" />
          New Packaging
        </Button>
      </div>

      {/* Filters */}
      <PackagingFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <PackagingTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onEditPackaging={handleEditPackaging}
        onDeletePackaging={handleDeletePackaging}
        onViewPackaging={handleViewPackaging}
      />

      {/* Pagination */}
      {data && (
        <PackagingPagination
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
      <PackagingDialog
        open={packagingDialog.open}
        onOpenChange={handlePackagingDialogClose}
        packaging={packagingDialog.packaging}
        mode={packagingDialog.mode}
      />

      <DeletePackagingDialog
        open={deleteDialog.open}
        onOpenChange={handleDeleteDialogClose}
        packaging={deleteDialog.packaging}
      />

      <PackagingDetailSheet
        open={detailSheet.open}
        onOpenChange={handleDetailSheetClose}
        packagingId={detailSheet.packagingId}
        onEdit={handleEditPackaging}
        onDelete={handleDeletePackaging}
      />
    </div>
  );
}
