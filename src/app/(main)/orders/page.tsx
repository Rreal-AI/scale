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
    <div className="space-y-4">
      {/* Content with integrated toggle */}
      {viewMode === "cards" ? (
        <OrdersDashboard 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      ) : (
        <OrdersTable 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </div>
  );
}
