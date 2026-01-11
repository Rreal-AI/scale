"use client";

import { useState, useMemo } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, Save, X, ChevronUp, ChevronDown, Tag } from "lucide-react";
import { formatPrice, formatWeight, formatRelativeTime } from "@/lib/format";
import { gramsToOunces, ouncesToGrams } from "@/lib/weight-conversion";
import { useWeightSampleStats } from "@/hooks/use-product-weight-samples";
import { WeightDeviationIndicator } from "./weight-deviation-indicator";
import { EditableNotes } from "./editable-notes";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  category_id: string | null;
  notes: string | null;
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
  onNotesUpdate?: (productId: string, notes: string | null) => Promise<void>;
  onFiltersChange?: (filters: {
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at" | "category";
    sort_order?: "asc" | "desc";
  }) => void;
  onBulkDelete?: (productIds: string[]) => Promise<void>;
  onBulkUpdateCategory?: (productIds: string[], categoryId: string | null) => Promise<void>;
  categories?: Array<{ id: string; name: string }>;
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
  const [editWeight, setEditWeight] = useState(gramsToOunces(product.weight).toFixed(2)); // Convert grams to ounces
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    const weightInGrams = ouncesToGrams(parseFloat(editWeight)); // Convert ounces to grams
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
    setEditWeight(gramsToOunces(product.weight).toFixed(2)); // Reset to original
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
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
              onKeyDown={handleKeyDown}
              placeholder="Enter weight in ounces"
              className="h-8"
              autoFocus
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
            <Skeleton className="h-4 w-4" />
          </TableCell>
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

interface WeightSampleStats {
  product_id: string;
  product_name: string | null;
  product_weight: number | null;
  sample_count: number;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: string | null;
}

interface WeightSampleStatsResponse {
  stats: WeightSampleStats[];
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
  onNotesUpdate,
  onFiltersChange,
  onBulkDelete,
  onBulkUpdateCategory,
  categories = [],
}: ProductsTableContentProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch weight sample stats for all products
  const { data: statsData } = useWeightSampleStats();
  const statsMap = useMemo(() => {
    const map = new Map<string, WeightSampleStats>();
    const stats = (statsData as WeightSampleStatsResponse)?.stats;
    if (stats) {
      stats.forEach((stat) => {
        map.set(stat.product_id, stat);
      });
    }
    return map;
  }, [statsData]);

  const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
    onFiltersChange?.({
      ...currentFilters,
      sort_by: sortBy as "name" | "price" | "weight" | "created_at" | "category",
      sort_order: sortOrder,
    });
  };

  const handleSelectAll = () => {
    if (!data) return;
    if (selectedProducts.size === data.products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(data.products.map(p => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0 || !onBulkDelete) return;
    await onBulkDelete(Array.from(selectedProducts));
    setSelectedProducts(new Set());
    setShowBulkActions(false);
  };

  const handleBulkCategoryUpdate = async (categoryId: string | null) => {
    if (selectedProducts.size === 0 || !onBulkUpdateCategory) return;
    await onBulkUpdateCategory(Array.from(selectedProducts), categoryId);
    setSelectedProducts(new Set());
    setShowBulkActions(false);
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
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="w-[50px]">Notes</TableHead>
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
              <TableHead className="w-[50px]"></TableHead>
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
              <TableHead className="w-[50px]">Notes</TableHead>
              <SortableHeader sortKey="created_at" currentSort={currentFilters} onSort={handleSort}>
                Updated
              </SortableHeader>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
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

  const allSelected = data && selectedProducts.size > 0 && selectedProducts.size === data.products.length;
  const someSelected = selectedProducts.size > 0 && !allSelected;

  return (
    <div className="space-y-2">
      {/* Bulk Actions Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Category Update Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Change Category
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleBulkCategoryUpdate(null)}>
                  <span>Remove Category</span>
                </DropdownMenuItem>
                {categories.length > 0 && <DropdownMenuSeparator />}
                {categories.map((category) => (
                  <DropdownMenuItem 
                    key={category.id}
                    onClick={() => handleBulkCategoryUpdate(category.id)}
                  >
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Delete Button */}
            <Button 
              variant="destructive" 
              size="sm"
              className="gap-2"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all products"
                  className={someSelected ? "opacity-50" : ""}
                />
              </TableHead>
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
              <TableHead className="w-[50px]">Notes</TableHead>
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
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => handleSelectProduct(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>
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
                <div className="flex items-center gap-2">
                  {onWeightUpdate ? (
                    <EditableWeight
                      product={product}
                      onWeightUpdate={onWeightUpdate}
                    />
                  ) : (
                    <Badge variant="outline">{formatWeight(product.weight)}</Badge>
                  )}
                  {(() => {
                    const stat = statsMap.get(product.id);
                    if (!stat) return null;
                    return (
                      <WeightDeviationIndicator
                        productWeight={product.weight}
                        avgSampleWeight={stat.avg_weight ? parseFloat(stat.avg_weight) : null}
                        sampleCount={stat.sample_count}
                      />
                    );
                  })()}
                </div>
              </TableCell>
              <TableCell>
                {onNotesUpdate ? (
                  <EditableNotes
                    product={product}
                    onNotesUpdate={onNotesUpdate}
                  />
                ) : (
                  product.notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {product.notes}
                    </span>
                  ) : null
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
    </div>
  );
}
