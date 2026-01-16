"use client";

import { useState } from "react";
import { WeighOrderView } from "./weigh-order-view";
import { useUpdateOrderWeight } from "@/hooks/use-orders";

export function WeighOrderViewWrapper() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const updateOrderWeightMutation = useUpdateOrderWeight();

  const handleOrderWeighed = async (
    orderId: string,
    totalWeightInGrams: number,
    status: "weighed" | "completed" = "completed"
  ) => {
    try {
      await updateOrderWeightMutation.mutateAsync({
        id: orderId,
        actual_weight: totalWeightInGrams,
        status,
      });
    } catch (error) {
      console.error("Error updating order weight:", error);
    }
  };

  return (
    <WeighOrderView
      selectedOrderId={selectedOrderId}
      onBack={() => {}} // No-op since we're on the main orders page
      onOrderSelect={setSelectedOrderId}
      onOrderWeighed={handleOrderWeighed}
    />
  );
}
