"use client";

// useState removed - not used in this component
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    sort_by?: "name" | "price" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  };
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  onViewProduct?: (product: Product) => void;
}

// Utility functions moved to @/lib/format

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
}: ProductsTableContentProps) {
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
              <TableHead>Created</TableHead>
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
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Created</TableHead>
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
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Created</TableHead>
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
                  <Badge variant="secondary" className="text-xs">
                    No category
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{formatPrice(product.price)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatWeight(product.weight)}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatRelativeTime(product.created_at)}
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
