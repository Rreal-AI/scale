"use client";

import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { formatWeight, formatRelativeTime } from "@/lib/format";
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

interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface PackagingResponse {
  packaging: Packaging[];
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

interface PackagingTableContentProps {
  data?: PackagingResponse;
  isLoading: boolean;
  error: Error | null;
  currentFilters: {
    search?: string;
    sort_by?: "name" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  };
  onEditPackaging?: (packaging: Packaging) => void;
  onDeletePackaging?: (packaging: Packaging) => void;
  onViewPackaging?: (packaging: Packaging) => void;
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

export function PackagingTableContent({
  data,
  isLoading,
  error,
  currentFilters,
  onEditPackaging,
  onDeletePackaging,
  onViewPackaging,
}: PackagingTableContentProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar el packaging: {error.message}
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

  if (!data || data.packaging.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <div className="text-muted-foreground">
                  {currentFilters.search ? (
                    <>
                      No packaging found matching &ldquo;{currentFilters.search}
                      &rdquo;
                    </>
                  ) : (
                    <>No packaging registered yet</>
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
            <TableHead>Weight</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.packaging.map((packaging) => (
            <TableRow key={packaging.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{packaging.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {packaging.id.slice(0, 8)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {formatWeight(packaging.weight)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatRelativeTime(packaging.created_at)}
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
                    <DropdownMenuItem
                      onClick={() => onViewPackaging?.(packaging)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEditPackaging?.(packaging)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeletePackaging?.(packaging)}
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
