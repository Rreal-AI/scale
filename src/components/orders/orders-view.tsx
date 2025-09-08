"use client";

import { useState } from "react";
import { OrdersDashboard } from "@/components/orders/orders-dashboard";
import { OrdersTable } from "@/components/orders/orders-table";

type ViewMode = "cards" | "table";

export function OrdersView() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="space-y-4">
      {/* Content with integrated toggle */}
      {viewMode === "cards" ? (
        <OrdersDashboard viewMode={viewMode} onViewModeChange={setViewMode} />
      ) : (
        <OrdersTable viewMode={viewMode} onViewModeChange={setViewMode} />
      )}
    </div>
  );
}
