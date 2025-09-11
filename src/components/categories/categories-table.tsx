"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { CategoriesFilters } from "./categories-filters";
import { CategoriesTableContent } from "./categories-table-content";
import { CategoriesPagination } from "./categories-pagination";
import { CategoryDialog } from "./category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { CategoryDetailSheet } from "./category-detail-sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function CategoriesTable() {
  const [filters, setFilters] = useState<{
    search?: string;
    sort_by?: "name" | "created_at";
    sort_order?: "asc" | "desc";
  }>({
    sort_by: "created_at",
    sort_order: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog and sheet states
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    category?: Category | null;
  }>({
    open: false,
    mode: "create",
    category: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({
    open: false,
    category: null,
  });

  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    categoryId: string | null;
  }>({
    open: false,
    categoryId: null,
  });

  const { data, isLoading, error } = useCategories({
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
  const handleCreateCategory = () => {
    setCategoryDialog({
      open: true,
      mode: "create",
      category: null,
    });
  };

  const handleEditCategory = (category: Category) => {
    setCategoryDialog({
      open: true,
      mode: "edit",
      category,
    });
  };

  const handleDeleteCategory = (category: Category) => {
    setDeleteDialog({
      open: true,
      category,
    });
  };

  const handleViewCategory = (category: Category) => {
    setDetailSheet({
      open: true,
      categoryId: category.id,
    });
  };

  const handleCategoryDialogClose = () => {
    setCategoryDialog({
      open: false,
      mode: "create",
      category: null,
    });
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      open: false,
      category: null,
    });
  };

  const handleDetailSheetClose = () => {
    setDetailSheet({
      open: false,
      categoryId: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Manage your product categories
          </p>
        </div>
        <Button variant="outline" onClick={handleCreateCategory}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {/* Filters */}
      <CategoriesFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <CategoriesTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onViewCategory={handleViewCategory}
      />

      {/* Pagination */}
      {data && (
        <CategoriesPagination
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
      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={handleCategoryDialogClose}
        category={categoryDialog.category}
        mode={categoryDialog.mode}
      />

      <DeleteCategoryDialog
        open={deleteDialog.open}
        onOpenChange={handleDeleteDialogClose}
        category={deleteDialog.category}
      />

      <CategoryDetailSheet
        open={detailSheet.open}
        onOpenChange={handleDetailSheetClose}
        categoryId={detailSheet.categoryId}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}
