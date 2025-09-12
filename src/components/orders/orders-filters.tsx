"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";

interface OrdersFiltersProps {
  onFiltersChange: (filters: {
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled";
    type?: "delivery" | "takeout";
    sort_by?:
      | "created_at"
      | "updated_at"
      | "customer_name"
      | "check_number"
      | "total_amount"
      | "status"
      | "type";
    sort_order?: "asc" | "desc";
  }) => void;
  currentFilters: {
    search?: string;
    status?: "pending_weight" | "weighed" | "completed" | "cancelled";
    type?: "delivery" | "takeout";
    sort_by?:
      | "created_at"
      | "updated_at"
      | "customer_name"
      | "check_number"
      | "total_amount"
      | "status"
      | "type";
    sort_order?: "asc" | "desc";
  };
}

const statusLabels = {
  pending_weight: "Pending Weight",
  weighed: "Ready for Lockers",
  completed: "Dispatched",
  cancelled: "Cancelled",
};

const statusColors = {
  pending_weight: "default" as const,
  weighed: "secondary" as const,
  completed: "outline" as const,
  cancelled: "destructive" as const,
};

const typeLabels = {
  delivery: "Delivery",
  takeout: "Takeout",
};

export function OrdersFilters({
  onFiltersChange,
  currentFilters,
}: OrdersFiltersProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search || "");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...currentFilters, search: localSearch || undefined });
  };

  const handleStatusChange = (
    status: "pending_weight" | "weighed" | "completed" | "cancelled" | "all"
  ) => {
    onFiltersChange({
      ...currentFilters,
      status: status === "all" ? undefined : status,
    });
  };

  const handleTypeChange = (type: "delivery" | "takeout" | "all") => {
    onFiltersChange({
      ...currentFilters,
      type: type === "all" ? undefined : type,
    });
  };

  const handleSortChange = (
    sort_by:
      | "created_at"
      | "updated_at"
      | "customer_name"
      | "check_number"
      | "total_amount"
      | "status"
      | "type"
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
    currentFilters.status ||
    currentFilters.type ||
    (currentFilters.sort_by && currentFilters.sort_by !== "created_at") ||
    (currentFilters.sort_order && currentFilters.sort_order !== "desc");

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex gap-2 flex-1 max-w-sm"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {/* Sort and Advanced Filters */}
        <div className="flex items-center gap-2">
          {/* Quick Sort */}
          <Select
            value={currentFilters.sort_by || "created_at"}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="updated_at">Updated Date</SelectItem>
              <SelectItem value="customer_name">Customer Name</SelectItem>
              <SelectItem value="check_number">Check Number</SelectItem>
              <SelectItem value="total_amount">Total Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="type">Type</SelectItem>
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
                    placeholder="Search by customer, email, or check number..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={currentFilters.status || "all"}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_weight">
                        Pending Weight
                      </SelectItem>
                      <SelectItem value="weighed">Ready for Lockers</SelectItem>
                      <SelectItem value="completed">Dispatched</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={currentFilters.type || "all"}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="takeout">Takeout</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="updated_at">Updated Date</SelectItem>
                      <SelectItem value="customer_name">
                        Customer Name
                      </SelectItem>
                      <SelectItem value="check_number">Check Number</SelectItem>
                      <SelectItem value="total_amount">Total Amount</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
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

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() =>
                      onFiltersChange({
                        ...currentFilters,
                        search: localSearch || undefined,
                      })
                    }
                  >
                    Apply
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

      {/* Active Filters Display */}
      {(currentFilters.status || currentFilters.type) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {currentFilters.status && (
            <Badge
              variant={statusColors[currentFilters.status]}
              className="cursor-pointer"
              onClick={() => handleStatusChange("all")}
            >
              {statusLabels[currentFilters.status]} ✕
            </Badge>
          )}
          {currentFilters.type && (
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => handleTypeChange("all")}
            >
              {typeLabels[currentFilters.type]} ✕
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}








