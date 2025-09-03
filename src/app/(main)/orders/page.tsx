"use client";

import { useState } from "react";
import { OrdersDashboard } from "@/components/orders/orders-dashboard";
import { OrdersTable } from "@/components/orders/orders-table";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "table";

export default function OrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center rounded-lg border p-1 bg-muted/50">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center gap-2 transition-all",
              viewMode === "cards" && "bg-background shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-2 transition-all",
              viewMode === "table" && "bg-background shadow-sm"
            )}
          >
            <Table className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "cards" ? <OrdersDashboard /> : <OrdersTable />}
    </div>
  );
}
