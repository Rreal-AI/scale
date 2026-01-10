"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface ModifiersFiltersProps {
  onFiltersChange: (filters: {
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  }) => void;
  currentFilters: {
    search?: string;
    sort_by?: "name" | "price" | "weight" | "created_at";
    sort_order?: "asc" | "desc";
  };
}

export function ModifiersFilters({
  onFiltersChange,
  currentFilters,
}: ModifiersFiltersProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search || "");

  // Debounce search - triggers after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (currentFilters.search || "")) {
        onFiltersChange({ ...currentFilters, search: localSearch || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleSortChange = (
    sort_by: "name" | "price" | "weight" | "created_at"
  ) => {
    onFiltersChange({ ...currentFilters, sort_by });
  };

  const handleSortOrderChange = (sort_order: "asc" | "desc") => {
    onFiltersChange({ ...currentFilters, sort_order });
  };

  const clearFilters = () => {
    setLocalSearch("");
    onFiltersChange({});
  };

  const hasActiveFilters =
    currentFilters.search ||
    (currentFilters.sort_by && currentFilters.sort_by !== "created_at") ||
    (currentFilters.sort_order && currentFilters.sort_order !== "desc");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="flex gap-2 flex-1 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search modifiers..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sort and Filters */}
      <div className="flex items-center gap-2">
        {/* Quick Sort */}
        <Select
          value={currentFilters.sort_by || "created_at"}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="weight">Weight</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentFilters.sort_order || "desc"}
          onValueChange={handleSortOrderChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-advanced">Search</Label>
                <Input
                  id="search-advanced"
                  placeholder="Search modifiers..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select
                  value={currentFilters.sort_by || "created_at"}
                  onValueChange={handleSortChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="created_at">Created Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order</Label>
                <Select
                  value={currentFilters.sort_order || "desc"}
                  onValueChange={handleSortOrderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="text-xs">
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
