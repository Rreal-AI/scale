"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OrderEventType } from "@/hooks/use-order-events";

interface TheLocksFiltersProps {
  onFiltersChange: (filters: {
    search?: string;
    event_type?: OrderEventType;
    date_from?: string;
    date_to?: string;
  }) => void;
  currentFilters: {
    search?: string;
    event_type?: OrderEventType;
    date_from?: string;
    date_to?: string;
  };
}

const eventTypeLabels: Record<OrderEventType, string> = {
  created: "Created",
  weight_verified: "Weight Verified",
  visual_verified: "Visual Verified",
  status_changed: "Status Changed",
  archived: "Archived",
  unarchived: "Unarchived",
};

export function TheLocksFilters({
  onFiltersChange,
  currentFilters,
}: TheLocksFiltersProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (currentFilters.search || "")) {
        onFiltersChange({ ...currentFilters, search: localSearch || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleEventTypeChange = (value: string) => {
    onFiltersChange({
      ...currentFilters,
      event_type: value === "all" ? undefined : (value as OrderEventType),
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...currentFilters,
      date_from: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...currentFilters,
      date_to: e.target.value || undefined,
    });
  };

  const clearFilters = () => {
    setLocalSearch("");
    onFiltersChange({});
  };

  const hasActiveFilters =
    currentFilters.search ||
    currentFilters.event_type ||
    currentFilters.date_from ||
    currentFilters.date_to;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            Search by Check #
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Event Type */}
        <div className="min-w-[180px]">
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            Event Type
          </Label>
          <Select
            value={currentFilters.event_type || "all"}
            onValueChange={handleEventTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="min-w-[160px]">
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            From Date
          </Label>
          <Input
            type="date"
            value={currentFilters.date_from || ""}
            onChange={handleDateFromChange}
          />
        </div>

        {/* Date To */}
        <div className="min-w-[160px]">
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            To Date
          </Label>
          <Input
            type="date"
            value={currentFilters.date_to || ""}
            onChange={handleDateToChange}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
