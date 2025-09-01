"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductsFilters } from "./products-filters";
import { ProductsTableContent } from "./products-table-content";
import { ProductsPagination } from "./products-pagination";
import { ProductDialog } from "./product-dialog";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductDetailSheet } from "./product-detail-sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

export function ProductsTable() {
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
  const [productDialog, setProductDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    product?: Product | null;
  }>({
    open: false,
    mode: "create",
    product: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    product: Product | null;
  }>({
    open: false,
    product: null,
  });

  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    productId: string | null;
  }>({
    open: false,
    productId: null,
  });

  const { data, isLoading, error } = useProducts({
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
  const handleCreateProduct = () => {
    setProductDialog({
      open: true,
      mode: "create",
      product: null,
    });
  };

  const handleEditProduct = (product: Product) => {
    setProductDialog({
      open: true,
      mode: "edit",
      product,
    });
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteDialog({
      open: true,
      product,
    });
  };

  const handleViewProduct = (product: Product) => {
    setDetailSheet({
      open: true,
      productId: product.id,
    });
  };

  const handleProductDialogClose = () => {
    setProductDialog({
      open: false,
      mode: "create",
      product: null,
    });
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      open: false,
      product: null,
    });
  };

  const handleDetailSheetClose = () => {
    setDetailSheet({
      open: false,
      productId: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={handleCreateProduct}>
          <Plus className="h-4 w-4 mr-2" />
          New Product
        </Button>
      </div>

      {/* Filters */}
      <ProductsFilters
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Table */}
      <ProductsTableContent
        data={data}
        isLoading={isLoading}
        error={error}
        currentFilters={filters}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onViewProduct={handleViewProduct}
      />

      {/* Pagination */}
      {data && (
        <ProductsPagination
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
      <ProductDialog
        open={productDialog.open}
        onOpenChange={handleProductDialogClose}
        product={productDialog.product}
        mode={productDialog.mode}
      />

      <DeleteProductDialog
        open={deleteDialog.open}
        onOpenChange={handleDeleteDialogClose}
        product={deleteDialog.product}
      />

      <ProductDetailSheet
        open={detailSheet.open}
        onOpenChange={handleDetailSheetClose}
        productId={detailSheet.productId}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
    </div>
  );
}
