"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type RulesFiltersType = {
  search?: string;
  sort_by?: "name" | "priority" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
  is_active?: boolean;
};

interface RulesFiltersProps {
  currentFilters: RulesFiltersType;
  onFiltersChange: (filters: RulesFiltersType) => void;
}

export function RulesFilters({ currentFilters, onFiltersChange }: RulesFiltersProps) {
  const [searchValue, setSearchValue] = useState(currentFilters.search || "");

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onFiltersChange({
      ...currentFilters,
      search: value || undefined,
    });
  };

  const handleSortChange = (sort_by: string) => {
    onFiltersChange({
      ...currentFilters,
      sort_by: sort_by as typeof currentFilters.sort_by,
    });
  };

  const handleSortOrderChange = (sort_order: string) => {
    onFiltersChange({
      ...currentFilters,
      sort_order: sort_order as typeof currentFilters.sort_order,
    });
  };

  const handleStatusFilter = (is_active: boolean | undefined) => {
    onFiltersChange({
      ...currentFilters,
      is_active,
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange({
      sort_by: "priority",
      sort_order: "asc",
    });
  };

  const hasActiveFilters = 
    currentFilters.search || 
    currentFilters.is_active !== undefined ||
    currentFilters.sort_by !== "priority" ||
    currentFilters.sort_order !== "asc";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search rules..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Sort By */}
        <Select
          value={currentFilters.sort_by || "priority"}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="created_at">Created</SelectItem>
            <SelectItem value="updated_at">Updated</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select
          value={currentFilters.sort_order || "asc"}
          onValueChange={handleSortOrderChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Status
              {currentFilters.is_active !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {currentFilters.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <button
              className="w-full px-2 py-1.5 text-sm text-left hover:bg-muted"
              onClick={() => handleStatusFilter(undefined)}
            >
              All Rules
            </button>
            <button
              className="w-full px-2 py-1.5 text-sm text-left hover:bg-muted"
              onClick={() => handleStatusFilter(true)}
            >
              Active Only
            </button>
            <button
              className="w-full px-2 py-1.5 text-sm text-left hover:bg-muted"
              onClick={() => handleStatusFilter(false)}
            >
              Inactive Only
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}