"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDeleteProduct } from "@/hooks/use-products";
import { formatPrice, formatWeight } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

// Utility functions moved to @/lib/format

export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
}: DeleteProductDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    if (!product) return;

    setIsDeleting(true);

    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Error deleting product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  const isLoading = isDeleting || deleteProduct.isPending;

  if (!product) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg border p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="font-medium">{product.name}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{formatPrice(product.price)}</Badge>
              <Badge variant="outline">{formatWeight(product.weight)}</Badge>
              {product.category ? (
                <Badge variant="outline" className="text-xs">
                  {product.category.name}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  No category
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {product.id}
            </div>
          </div>
        </div>

        <AlertDialogDescription>
          Are you sure you want to delete this product? This action will
          permanently remove the product from your catalog.
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Product
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
