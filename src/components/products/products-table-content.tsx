"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, Save, X, ChevronUp, ChevronDown } from "lucide-react";
import { formatPrice, formatWeight, formatRelativeTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  filters: {
    search?: string;
    sort_by: string;
    sort_order: string;
  };
}

interface ProductsTableContentProps {
  data?: ProductsResponse;
  isLoading: boolean;
  error: Error | null;
  currentFilters: {
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at" | "category";
    sort_order?: "asc" | "desc";
  };
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
  onWeightUpdate?: (productId: string, newWeight: number) => Promise<void>;
  onFiltersChange?: (filters: {
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at" | "category";
    sort_order?: "asc" | "desc";
  }) => void;
}

// Utility functions moved to @/lib/format

// Component for sortable table headers
function SortableHeader({ 
  children, 
  sortKey, 
  currentSort, 
  onSort 
}: { 
  children: React.ReactNode;
  sortKey: "name" | "price" | "weight" | "created_at" | "category";
  currentSort: { sort_by?: string; sort_order?: "asc" | "desc" };
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
}) {
  const isActive = currentSort.sort_by === sortKey;
  const isAsc = currentSort.sort_order === "asc";

  const handleClick = () => {
    if (isActive) {
      // If already sorting by this column, toggle direction
      onSort(sortKey, isAsc ? "desc" : "asc");
    } else {
      // If not currently sorting by this column, start with asc
      onSort(sortKey, "asc");
    }
  };

  return (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          <ChevronUp 
            className={`h-3 w-3 ${
              isActive && isAsc ? "text-gray-900" : "text-gray-300"
            }`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${
              isActive && !isAsc ? "text-gray-900" : "text-gray-300"
            }`} 
          />
        </div>
      </div>
    </TableHead>
  );
}

// Component for editable weight
function EditableWeight({ product, onWeightUpdate }: { 
  product: Product; 
  onWeightUpdate: (productId: string, newWeight: number) => Promise<void>; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editWeight, setEditWeight] = useState((product.weight / 28.3495).toFixed(2)); // Convert grams to ounces
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    const weightInGrams = Math.round(parseFloat(editWeight) * 28.3495); // Convert ounces to grams
    if (weightInGrams === product.weight) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onWeightUpdate(product.id, weightInGrams);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update weight:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditWeight((product.weight / 28.3495).toFixed(2)); // Reset to original
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="h-auto p-1 text-xs cursor-pointer hover:bg-gray-50"
          onClick={() => setIsOpen(true)}
        >
          {formatWeight(product.weight)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start" side="top">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight (ounces)</label>
            <Input
              type="number"
              step="0.01"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              placeholder="Enter weight in ounces"
              className="h-8"
            />
            <div className="text-xs text-muted-foreground">
              Current: {formatWeight(product.weight)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleSave}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <Save className="h-3 w-3 mr-1 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-[100px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-[80px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-[60px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[100px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function ProductsTableContent({
  data,
  isLoading,
  error,
  currentFilters,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  onWeightUpdate,
  onFiltersChange,
}: ProductsTableContentProps) {
  const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
    onFiltersChange?.({
      ...currentFilters,
      sort_by: sortBy as "name" | "price" | "weight" | "created_at" | "category",
      sort_order: sortOrder,
    });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar los productos: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <LoadingSkeleton />
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.products.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKey="name" currentSort={currentFilters} onSort={handleSort}>
                Name
              </SortableHeader>
              <SortableHeader sortKey="category" currentSort={currentFilters} onSort={handleSort}>
                Category
              </SortableHeader>
              <SortableHeader sortKey="price" currentSort={currentFilters} onSort={handleSort}>
                Price
              </SortableHeader>
              <SortableHeader sortKey="weight" currentSort={currentFilters} onSort={handleSort}>
                Weight
              </SortableHeader>
              <SortableHeader sortKey="created_at" currentSort={currentFilters} onSort={handleSort}>
                Updated
              </SortableHeader>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <div className="text-muted-foreground">
                  {currentFilters.search ? (
                    <>
                      No products found matching &ldquo;{currentFilters.search}
                      &rdquo;
                    </>
                  ) : (
                    <>No products registered yet</>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader sortKey="name" currentSort={currentFilters} onSort={handleSort}>
              Name
            </SortableHeader>
            <SortableHeader sortKey="category" currentSort={currentFilters} onSort={handleSort}>
              Category
            </SortableHeader>
            <SortableHeader sortKey="price" currentSort={currentFilters} onSort={handleSort}>
              Price
            </SortableHeader>
            <SortableHeader sortKey="weight" currentSort={currentFilters} onSort={handleSort}>
              Weight
            </SortableHeader>
              <SortableHeader sortKey="created_at" currentSort={currentFilters} onSort={handleSort}>
                Updated
              </SortableHeader>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {product.id.slice(0, 8)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {product.category ? (
                  <Badge variant="outline" className="text-xs">
                    {product.category.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    No category
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatPrice(product.price)}</Badge>
              </TableCell>
              <TableCell>
                {onWeightUpdate ? (
                  <EditableWeight 
                    product={product} 
                    onWeightUpdate={onWeightUpdate} 
                  />
                ) : (
                  <Badge variant="outline">{formatWeight(product.weight)}</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatRelativeTime(product.updated_at)}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProduct?.(product)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditProduct?.(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteProduct?.(product)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
