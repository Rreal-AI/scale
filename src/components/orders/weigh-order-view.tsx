"use client";

import { useState, useEffect } from "react";
import { useRealTimeOrders, useOrder, useRevertOrderStatus } from "@/hooks/use-orders";
import { usePackaging } from "@/hooks/use-packaging";
import { useOrganization } from "@/hooks/use-organization";
import { useCreateWeightSample } from "@/hooks/use-product-weight-samples";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WeightInputModal } from "./weight-input-modal";
import { formatPrice } from "@/lib/format";
import { gramsToOunces, ouncesToGrams } from "@/lib/weight-conversion";
import { analyzeOrderWeight } from "@/lib/weight-analysis";
import {
  ArrowLeft,
  Search,
  Scale,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Undo2,
  Loader2,
  X,
  Camera,
  Eye,
} from "lucide-react";
import { CameraCapture } from "./camera-capture";
import { VisualVerificationResultCard } from "./visual-verification-result";
import { useVisualVerification } from "@/hooks/use-visual-verification";
import type { VisualVerificationResult } from "@/schemas/visual-verification";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
  type: "delivery" | "takeout";
  check_number: string;
  customer_name: string;
  customer_address?: string;
  total_amount: number;
  expected_weight?: number;
  created_at: string;
  structured_output?: {
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
      modifiers?: Array<{
        name: string;
        price: number;
      }>;
    }>;
  };
}

interface WeighOrderViewProps {
  selectedOrderId: string | null;
  onBack: () => void;
  onOrderSelect: (orderId: string) => void;
  onOrderWeighed: (
    orderId: string,
    totalWeight: number,
    status?: "weighed" | "completed"
  ) => void;
}

interface BagWeight {
  id: string;
  weight: number;
}

interface PackagingSelection {
  packagingId: string;
  quantity: number;
}

export function WeighOrderView({
  selectedOrderId,
  onBack,
  onOrderSelect,
  onOrderWeighed,
}: WeighOrderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "delivery" | "takeout"
  >("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending_weight" | "weighed"
  >("pending_weight");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "customer">(
    "newest"
  );
  const [selectedReadyIds, setSelectedReadyIds] = useState<Set<string>>(
    new Set()
  );
  
  // Trigger for re-rendering order list when weighing progress changes
  const [weighingProgressTrigger, setWeighingProgressTrigger] = useState<number>(0);

  // Fetch packaging options from database
  const { data: packagingData } = usePackaging({ limit: 100 });
  const packagingOptions = packagingData?.packaging ?? [];

  // Fetch organization settings for weight tolerance
  const { data: orgData } = useOrganization();
  const toleranceGrams = orgData?.order_weight_delta_tolerance ?? 100;
  const toleranceOz = gramsToOunces(toleranceGrams);

  // Weighing state
  const [bagCount, setBagCount] = useState<number>(1);
  const [bagWeights, setBagWeights] = useState<BagWeight[]>([
    { id: "bag-1", weight: 0 },
  ]);
  // Store packaging selections (multiple per bag with quantity)
  const [bagPackaging, setBagPackaging] = useState<Record<string, PackagingSelection[]>>({});
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedBagForWeighing, setSelectedBagForWeighing] = useState<{
    id: string;
    number: number;
  } | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  // Revert order status hook
  const revertOrderStatus = useRevertOrderStatus();

  // Weight sample hook
  const createWeightSample = useCreateWeightSample();

  // Visual verification state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [visualResult, setVisualResult] = useState<{
    result: VisualVerificationResult;
    status: "verified" | "missing_items" | "extra_items" | "uncertain";
  } | null>(null);
  const visualVerification = useVisualVerification();

  // Auto-save weighing progress
  const saveWeighingProgress = (orderId: string, bagWeights: BagWeight[], bagPackaging: Record<string, PackagingSelection[]>, bagCount: number) => {
    const progress = {
      orderId,
      bagWeights,
      bagPackaging,
      bagCount,
      timestamp: Date.now()
    };
    localStorage.setItem(`weighing-progress-${orderId}`, JSON.stringify(progress));
    // Trigger re-render to update orange indicators in the list
    setWeighingProgressTrigger(prev => prev + 1);
  };

  const loadWeighingProgress = (orderId: string) => {
    try {
      const saved = localStorage.getItem(`weighing-progress-${orderId}`);
      if (saved) {
        const progress = JSON.parse(saved);
        // Only load if it's from the last 24 hours
        if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
          return progress;
        }
      }
    } catch (error) {
      console.error("Error loading weighing progress:", error);
    }
    return null;
  };

  const clearWeighingProgress = (orderId: string) => {
    localStorage.removeItem(`weighing-progress-${orderId}`);
    // Trigger re-render to update orange indicators in the list
    setWeighingProgressTrigger(prev => prev + 1);
  };

  // Find default packaging from database
  const defaultPackaging = packagingOptions.find(p => p.is_default);

  // Load weighing progress when order changes
  useEffect(() => {
    if (selectedOrderId) {
      const savedProgress = loadWeighingProgress(selectedOrderId);
      if (savedProgress) {
        setBagWeights(savedProgress.bagWeights);
        setBagPackaging(savedProgress.bagPackaging);
        setBagCount(savedProgress.bagCount);
        console.log("Restored weighing progress for order", selectedOrderId);
      } else {
        // Reset to default if no saved progress
        setBagWeights([{ id: "bag-1", weight: 0 }]);
        // Pre-select default packaging if one exists
        const defaultPkgId = defaultPackaging?.id || "";
        setBagPackaging(defaultPkgId ? { "bag-1": [{ packagingId: defaultPkgId, quantity: 1 }] } : {});
        setBagCount(1);
      }
    }
  }, [selectedOrderId, defaultPackaging?.id]);

  // Clear visual verification result when order changes
  useEffect(() => {
    setVisualResult(null);
  }, [selectedOrderId]);

  // Handler for visual verification
  const handleVisualVerification = async (imageBase64: string) => {
    if (!selectedOrderId) return;

    try {
      const response = await visualVerification.mutateAsync({
        orderId: selectedOrderId,
        image: imageBase64,
      });

      setVisualResult({
        result: response.result,
        status: response.status,
      });
      setCameraOpen(false);

      if (response.status === "verified") {
        toast.success("Pedido verificado visualmente");
      } else if (response.status === "missing_items") {
        toast.error("Se detectaron items faltantes");
      } else {
        toast.warning("Verificacion requiere revision manual");
      }
    } catch (error) {
      toast.error("Error al verificar visualmente");
      console.error(error);
    }
  };

  // Fetch orders for sidebar
  const { data: ordersData } = useRealTimeOrders({
    limit: 100,
    search: searchQuery || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    sort_by:
      selectedStatus === "weighed"
        ? "updated_at"
        : sortBy === "customer"
        ? "customer_name"
        : "created_at",
    sort_order: sortBy === "oldest" ? "asc" : "desc",
  });

  // Separate fetch to always know how many are ready for lockers
  const { data: readyOrdersData } = useRealTimeOrders({
    limit: 100,
    status: "weighed",
    sort_by: "updated_at",
    sort_order: "desc",
  });

  // Fetch selected order details
  const { data: selectedOrderData } = useOrder(selectedOrderId || "");
  const selectedOrder = selectedOrderData?.order;

  // Debug expected weight
  useEffect(() => {
    if (selectedOrder) {
      console.log("Selected order expected_weight:", selectedOrder.expected_weight);
      console.log("Selected order structured_output:", selectedOrder.structured_output);
    }
  }, [selectedOrder]);

  const orders = ordersData?.orders || [];
  const displayOrders = (() => {
    if (selectedStatus === "weighed") {
      return [...orders].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
    if (selectedStatus === "all") {
      const weighedFirst = orders
        .filter((o) => o.status === "weighed")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      const pending = orders
        .filter((o) => o.status === "pending_weight")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      const others = orders
        .filter((o) => o.status !== "weighed" && o.status !== "pending_weight")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      return [...weighedFirst, ...pending, ...others];
    }
    return orders;
  })();

  // Helper to check if order has weighing progress
  const hasWeighingProgress = (orderId: string): boolean => {
    try {
      const saved = localStorage.getItem(`weighing-progress-${orderId}`);
      if (!saved) return false;
      const progress = JSON.parse(saved);
      // Check if progress is recent (within 24 hours) and has actual weight data
      if (Date.now() - progress.timestamp > 24 * 60 * 60 * 1000) return false;
      // Check if any bag has weight > 0
      return progress.bagWeights?.some((bag: BagWeight) => bag.weight > 0) || false;
    } catch {
      return false;
    }
  };

  const toggleSelectReady = (orderId: string) => {
    setSelectedReadyIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllReady = () => {
    setSelectedReadyIds(
      new Set(
        displayOrders.filter((o) => o.status === "weighed").map((o) => o.id)
      )
    );
  };

  const clearReadySelection = () => setSelectedReadyIds(new Set());

  // Add bag
  const addBag = () => {
    if (bagCount < 10) {
      const newBagCount = bagCount + 1;
      setBagCount(newBagCount);
      const id = `bag-${newBagCount}`;
      setBagWeights((prev) => {
        const updated = [...prev, { id, weight: 0 }];
        // Auto-save progress
        if (selectedOrderId) {
          saveWeighingProgress(selectedOrderId, updated, bagPackaging, newBagCount);
        }
        return updated;
      });
      // Pre-select default packaging for new bags
      if (defaultPackaging?.id) {
        setBagPackaging((prev) => ({ ...prev, [id]: [{ packagingId: defaultPackaging.id, quantity: 1 }] }));
      }
    }
  };

  // Remove bag
  const removeBag = () => {
    if (bagCount > 1) {
      const newBagCount = bagCount - 1;
      setBagCount(newBagCount);
      setBagWeights((prev) => {
        const updated = prev.slice(0, newBagCount);
        // Auto-save progress
        if (selectedOrderId) {
          saveWeighingProgress(selectedOrderId, updated, bagPackaging, newBagCount);
        }
        return updated;
      });
    }
  };

  // Handle opening weight modal
  const handleOpenWeightModal = (bagId: string, bagNumber: number) => {
    setSelectedBagForWeighing({ id: bagId, number: bagNumber });
    setWeightModalOpen(true);
  };

  // Handle weight confirmation from modal
  const handleWeightConfirm = (weight: number) => {
    if (selectedBagForWeighing) {
      updateBagWeight(selectedBagForWeighing.id, weight);
      
      // Auto-advance to next bag if available
      const currentBagIndex = bagWeights.findIndex(bag => bag.id === selectedBagForWeighing.id);
      const nextBagIndex = currentBagIndex + 1;
      
      if (nextBagIndex < bagWeights.length) {
        // Move to next bag
        const nextBag = bagWeights[nextBagIndex];
        setSelectedBagForWeighing({ 
          id: nextBag.id, 
          number: nextBagIndex + 1 
        });
        // Keep modal open for next bag
      } else {
        // No more bags, close modal
        setWeightModalOpen(false);
        setSelectedBagForWeighing(null);
      }
    }
  };

  // Update individual bag weight
  const updateBagWeight = (bagId: string, weight: number) => {
    setBagWeights((prev) => {
      const updated = prev.map((bag) => (bag.id === bagId ? { ...bag, weight } : bag));
      // Auto-save progress
      if (selectedOrderId) {
        saveWeighingProgress(selectedOrderId, updated, bagPackaging, bagCount);
      }
      return updated;
    });
  };

  // Calculate total weight including packaging (from database)
  const totalWeight = Math.round(
    bagWeights.reduce((sum, bag) => {
      const bagWeight = bag.weight;
      // Sum all packaging selections for this bag
      const packagingSelections = bagPackaging[bag.id] || [];
      const totalPackagingWeightOz = packagingSelections.reduce((pkgSum, selection) => {
        const packagingItem = packagingOptions.find(p => p.id === selection.packagingId);
        if (packagingItem) {
          return pkgSum + gramsToOunces(packagingItem.weight) * selection.quantity;
        }
        return pkgSum;
      }, 0);
      return sum + bagWeight + totalPackagingWeightOz;
    }, 0) * 100
  ) / 100; // Round to 2 decimal places to fix floating point precision

  // Handle complete weighing or re-weigh
  const handleWeighAction = () => {
    if (!selectedOrderId || totalWeight === 0) return;

    const expectedWeightOz = selectedOrder?.expected_weight
      ? gramsToOunces(selectedOrder.expected_weight)
      : 0;

    // Only analyze if we have expected weight
    if (expectedWeightOz > 0) {
      const structuredOutput = selectedOrder?.structured_output as {
        items?: Array<{
          name: string;
          quantity: number;
          price: number;
          modifiers?: Array<{ name: string; price: number }>;
        }>;
      } | null;
      const analysis = analyzeOrderWeight(
        totalWeight,
        expectedWeightOz,
        structuredOutput?.items || [],
        toleranceOz
      );

      if (analysis.status === "underweight") {
        // Don't complete - just reset for re-weighing
        resetWeighingState();
        return;
      }
    }

    // Complete weighing (for perfect/overweight orders or orders without expected weight)
    const weightInGrams = ouncesToGrams(totalWeight);
    onOrderWeighed(selectedOrderId, weightInGrams);

    // Auto-advance to next pending order
    const nextPendingOrder = orders.find(
      (order) =>
        order.status === "pending_weight" && order.id !== selectedOrderId
    );

    if (nextPendingOrder) {
      onOrderSelect(nextPendingOrder.id);
    }

    resetWeighingState();
  };

  // Reset weighing state
  const resetWeighingState = () => {
    setBagCount(1);
    setBagWeights([{ id: "bag-1", weight: 0 }]);
    // Reset to default packaging if one exists
    const defaultPkgId = defaultPackaging?.id || "";
    setBagPackaging(defaultPkgId ? { "bag-1": [{ packagingId: defaultPkgId, quantity: 1 }] } : {});
    // Clear saved progress when resetting
    if (selectedOrderId) {
      clearWeighingProgress(selectedOrderId);
    }
  };

  const getOrderItems = (order: Order) => {
    const items = order.structured_output?.items || [];
    if (items.length === 0) return "No items";

    return (
      items
        .slice(0, 2)
        .map((item) => {
          const modifiersText =
            item.modifiers && item.modifiers.length > 0
              ? ` (+${item.modifiers.length})`
              : "";
          return `${item.quantity}x ${item.name}${modifiersText}`;
        })
        .join(", ") + (items.length > 2 ? "..." : "")
    );
  };

  const getDueTime = (
    createdAt: string,
    status: string
  ): { time: string; isUrgent: boolean } => {
    // Completed orders are never urgent
    if (status === "completed" || status === "weighed") {
      return { time: "Completed", isUrgent: false };
    }

    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60)
    );

    const estimatedDueMinutes = 45;
    const remainingMinutes = estimatedDueMinutes - diffMinutes;

    if (remainingMinutes <= 0) {
      return { time: "Overdue", isUrgent: true };
    } else if (remainingMinutes <= 10) {
      return { time: `${remainingMinutes}m`, isUrgent: true };
    } else {
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      return {
        time: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        isUrgent: false,
      };
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Orders List - Tablet Optimized */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-3 p-2 hover:bg-blue-50 text-blue-600 border border-blue-200 bg-blue-50 rounded-md w-full justify-start"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold">Orders</span>
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>

          {/* Quick Filters - Touch Optimized */}
          <div className="space-y-2">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus("all")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedStatus === "all" 
                    ? "bg-gray-900 text-white border-gray-900" 
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus("pending_weight")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedStatus === "pending_weight" 
                    ? "bg-gray-900 text-white border-gray-900" 
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === "weighed" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("weighed")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedStatus === "weighed" ? "text-white" : ""
                )}
                style={selectedStatus === "weighed" ? {
                  backgroundColor: "#10b981", // emerald-500
                  borderColor: "#10b981"
                } : {
                  color: "#10b981",
                  borderColor: "#10b981",
                  backgroundColor: "transparent"
                }}
              >
                Ready for Lockers
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedType("all")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedType === "all" 
                    ? "bg-gray-900 text-white border-gray-900" 
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
              >
                All Types
              </Button>
              <Button
                variant={selectedType === "delivery" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("delivery")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedType === "delivery" ? "text-white" : ""
                )}
                style={selectedType === "delivery" ? {
                  backgroundColor: "var(--color-primary)",
                  borderColor: "var(--color-primary)"
                } : {
                  color: "var(--color-primary)",
                  borderColor: "var(--color-primary)",
                  backgroundColor: "transparent"
                }}
              >
                <Truck className="h-3 w-3 mr-1" />
                Delivery
              </Button>
              <Button
                variant={selectedType === "takeout" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("takeout")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedType === "takeout" ? "text-white" : ""
                )}
                style={selectedType === "takeout" ? {
                  backgroundColor: "var(--color-secondary)",
                  borderColor: "var(--color-secondary)"
                } : {
                  color: "var(--color-secondary)",
                  borderColor: "var(--color-secondary)",
                  backgroundColor: "transparent"
                }}
              >
                <Package className="h-3 w-3 mr-1" />
                Pickup
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto">
          {/* Priority banner when there are Ready for Lockers */}
          {readyOrdersData?.orders &&
            readyOrdersData.orders.length > 0 &&
            selectedStatus !== "weighed" && (
              <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
                <div className="text-sm text-yellow-800 font-medium">
                  {readyOrdersData.orders.length} order
                  {readyOrdersData.orders.length > 1 ? "s" : ""} ready for
                  lockers
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStatus("weighed")}
                >
                  View
                </Button>
              </div>
            )}
          {/* Ready for Lockers batch bar */}
          {selectedStatus === "weighed" && (
            <div className="flex items-center justify-between p-2 mb-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={(e) =>
                    e.target.checked ? selectAllReady() : clearReadySelection()
                  }
                />
                <span className="text-sm text-blue-900 font-medium">
                  Select All
                </span>
                <span className="text-sm text-blue-700">
                  {selectedReadyIds.size} selected
                </span>
              </div>
              <Button
                size="sm"
                disabled={selectedReadyIds.size === 0}
                onClick={async () => {
                  try {
                    const ids = Array.from(selectedReadyIds);
                    const res = await fetch(`/api/orders`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ids }),
                    });
                    if (!res.ok) throw new Error("Batch complete failed");
                    clearReadySelection();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Complete Selected
              </Button>
            </div>
          )}

          {displayOrders.map((order) => {
            const { time: dueTime, isUrgent } = getDueTime(
              order.created_at,
              order.status
            );
            const isSelected = selectedOrderId === order.id;

            return (
              <div
                key={order.id}
                onClick={() => onOrderSelect(order.id)}
                className={cn(
                  "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100",
                  isSelected && "bg-blue-50 border-blue-200",
                  isUrgent &&
                    order.status === "pending_weight" &&
                    "border-l-4 border-l-red-400",
                  order.status === "completed" &&
                    "bg-green-50 border-green-100 opacity-75"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectedStatus === "weighed" && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 mr-1"
                        checked={selectedReadyIds.has(order.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectReady(order.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <span className="font-medium text-sm">
                      #{order.check_number}
                    </span>
                    {order.type === "delivery" && (
                      <Truck className="h-3 w-3 text-gray-400" />
                    )}
                    {order.type === "takeout" && (
                      <Package className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Draft Indicator - Shows when order has weighing progress saved */}
                    {order.status === "pending_weight" && hasWeighingProgress(order.id) && (
                      <div 
                        className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                        title="Weighing in progress"
                      />
                    )}
                    {isUrgent && order.status === "pending_weight" && (
                      <Badge
                        variant="destructive"
                        className="text-xs px-1 py-0"
                      >
                        {dueTime}
                      </Badge>
                    )}
                    {order.status === "pending_weight" && (
                      <Badge 
                        variant="outline" 
                        className="text-xs px-1 py-0 text-gray-600 border-gray-300 bg-gray-50"
                      >
                        Awaiting
                      </Badge>
                    )}
                    {order.status === "weighed" && (
                      <Badge
                        variant="outline"
                        className="text-xs px-1 py-0 text-green-600 border-green-300 bg-green-50"
                      >
                        ✓ Ready
                      </Badge>
                    )}
                    {order.status === "completed" && (
                      <Badge
                        variant="outline"
                        className="text-xs px-1 py-0 text-blue-600 border-blue-300 bg-blue-50"
                      >
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {getOrderItems(order)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatPrice(order.total_amount)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {!isUrgent && dueTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content - Order Details & Weighing */}
      <div className="flex-1 flex flex-col">
        {selectedOrder ? (
          <>
            {/* Order Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Order #{selectedOrder.check_number}
                  </h1>
                  <p className="text-gray-600">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_address && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedOrder.customer_address}
                    </p>
                  )}
                  
                  {/* Order Items - MOVED HERE, SMALLER */}
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Order Items</h3>
                    <div className="space-y-1">
                      {(() => {
                        const structuredOutput =
                          selectedOrder.structured_output as {
                            items?: Array<{
                              name: string;
                              quantity: number;
                              price: number;
                              modifiers?: Array<{ name: string; price: number }>;
                            }>;
                          } | null;
                        return structuredOutput?.items?.map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.quantity}x
                                </span>
                                <span>{item.name}</span>
                              </div>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="ml-4 mt-0.5 space-y-0.5">
                                  {item.modifiers.map((modifier, modIndex) => (
                                    <div
                                      key={modIndex}
                                      className="text-xs text-gray-600 flex items-center gap-1"
                                    >
                                      <span className="text-gray-300">•</span>
                                      <span>{modifier.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                      })() || (
                        <div className="text-sm text-gray-500">
                          No items found
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expected Weight and Total Weight - MOVED HERE */}
                <div className="ml-6 space-y-4">
                  {/* Expected Weight */}
                  <Card className="w-64">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Expected Weight</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-900">
                        {selectedOrder.expected_weight && selectedOrder.expected_weight > 0
                          ? `${gramsToOunces(selectedOrder.expected_weight).toFixed(2)} oz`
                          : "Not calculated"}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Weight */}
                  <Card className="w-64">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Weight</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalWeight.toFixed(2)} oz
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Main Content - Fixed Height Weight Verification */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Weight Verification - Fixed Height with Conditional Scroll */}
              {selectedOrder.status === "pending_weight" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-6">
                    <div className="max-w-2xl mx-auto">
                      <Card className="h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Scale className="h-6 w-6" />
                            Weight Verification
                          </CardTitle>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              onClick={removeBag}
                              disabled={bagCount <= 1}
                              className="w-12 h-12 p-0 border-2 border-gray-300 hover:border-red-300 hover:bg-red-50"
                            >
                              <Minus className="h-6 w-6" />
                            </Button>
                            <div className="text-lg font-bold px-6 py-3 bg-gray-100 rounded-xl border-2 border-gray-200 min-w-[120px] text-center">
                              {bagCount} bag{bagCount > 1 ? "s" : ""}
                            </div>
                            <Button
                              variant="outline"
                              onClick={addBag}
                              disabled={bagCount >= 10}
                              className="w-12 h-12 p-0 border-2 border-gray-300 hover:border-green-300 hover:bg-green-50"
                            >
                              <Plus className="h-6 w-6" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-y-auto space-y-6">

                        {/* Bag Weight Inputs - Clean Layout */}
                        <div className="grid gap-4">
                          {bagWeights.map((bag, index) => (
                            <div
                              key={bag.id}
                              className="border rounded-lg p-3 space-y-3"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-lg font-medium text-gray-700 w-20">
                                  Bag {index + 1}
                                </div>
                                <Button
                                variant="outline"
                                className={cn(
                                  "flex-1 h-16 text-lg justify-center transition-all border-2",
                                  bag.weight > 0
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "border-dashed border-gray-300 text-gray-500 hover:border-gray-400"
                                )}
                                onClick={() =>
                                  handleOpenWeightModal(bag.id, index + 1)
                                }
                              >
                                {bag.weight > 0
                                  ? `${bag.weight} oz`
                                  : "Tap to weigh"}
                              </Button>
                              {bag.weight > 0 && (
                                <Button
                                  variant="outline"
                                  onClick={() => updateBagWeight(bag.id, 0)}
                                  className="h-16 w-16 p-0 text-gray-500 hover:text-red-500 hover:border-red-200 border-2"
                                >
                                  ×
                                </Button>
                              )}
                              </div>

                              {/* Packaging selections for this bag */}
                              <div className="space-y-2 ml-24">
                                {(bagPackaging[bag.id] || []).map((selection, selIndex) => (
                                  <div key={selIndex} className="flex items-center gap-2">
                                    <select
                                      className="h-9 border rounded px-2 text-sm text-gray-700 flex-1"
                                      value={selection.packagingId}
                                      onChange={(e) => {
                                        setBagPackaging((prev) => {
                                          const current = [...(prev[bag.id] || [])];
                                          current[selIndex] = { ...current[selIndex], packagingId: e.target.value };
                                          const updated = { ...prev, [bag.id]: current };
                                          if (selectedOrderId) {
                                            saveWeighingProgress(selectedOrderId, bagWeights, updated, bagCount);
                                          }
                                          return updated;
                                        });
                                      }}
                                    >
                                      <option value="">Select packaging</option>
                                      {packagingOptions.map((pkg) => (
                                        <option key={pkg.id} value={pkg.id}>
                                          {pkg.name} ({gramsToOunces(pkg.weight).toFixed(2)} oz)
                                        </option>
                                      ))}
                                    </select>

                                    {/* Quantity input */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-500">x</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        className="w-14 h-9 border rounded px-2 text-sm text-center"
                                        value={selection.quantity}
                                        onChange={(e) => {
                                          const qty = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                          setBagPackaging((prev) => {
                                            const current = [...(prev[bag.id] || [])];
                                            current[selIndex] = { ...current[selIndex], quantity: qty };
                                            const updated = { ...prev, [bag.id]: current };
                                            if (selectedOrderId) {
                                              saveWeighingProgress(selectedOrderId, bagWeights, updated, bagCount);
                                            }
                                            return updated;
                                          });
                                        }}
                                      />
                                    </div>

                                    {/* Remove button */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-gray-400 hover:text-red-500"
                                      onClick={() => {
                                        setBagPackaging((prev) => {
                                          const current = [...(prev[bag.id] || [])];
                                          current.splice(selIndex, 1);
                                          const updated = { ...prev, [bag.id]: current };
                                          if (selectedOrderId) {
                                            saveWeighingProgress(selectedOrderId, bagWeights, updated, bagCount);
                                          }
                                          return updated;
                                        });
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}

                                {/* Add packaging button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-gray-600"
                                  onClick={() => {
                                    setBagPackaging((prev) => {
                                      const current = prev[bag.id] || [];
                                      const updated = {
                                        ...prev,
                                        [bag.id]: [...current, { packagingId: "", quantity: 1 }],
                                      };
                                      if (selectedOrderId) {
                                        saveWeighingProgress(selectedOrderId, bagWeights, updated, bagCount);
                                      }
                                      return updated;
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Packaging
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Visual Verification Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Verificacion Visual (AI)
                            </h4>
                          </div>

                          {!visualResult ? (
                            <Button
                              variant="outline"
                              onClick={() => setCameraOpen(true)}
                              disabled={visualVerification.isPending}
                              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              {visualVerification.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Analizando imagen...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-4 w-4 mr-2" />
                                  Verificar con Foto
                                </>
                              )}
                            </Button>
                          ) : (
                            <VisualVerificationResultCard
                              result={visualResult.result}
                              status={visualResult.status}
                              onRetry={() => {
                                setVisualResult(null);
                                setCameraOpen(true);
                              }}
                              onDismiss={() => setVisualResult(null)}
                            />
                          )}
                        </div>

                        <Separator />

                        {/* Total Weight Display with Analysis - only show after user has weighed something */}
                        {bagWeights.some(bag => bag.weight > 0) && (() => {
                          const expectedWeightOz = selectedOrder.expected_weight
                            ? gramsToOunces(selectedOrder.expected_weight)
                            : 0;
                          // Skip analysis if no expected weight - just allow completion
                          const structuredOutput =
                            selectedOrder.structured_output as {
                              items?: Array<{
                                name: string;
                                quantity: number;
                                price: number;
                                modifiers?: Array<{
                                  name: string;
                                  price: number;
                                }>;
                              }>;
                            } | null;
                          const analysis =
                            totalWeight > 0 && expectedWeightOz > 0
                              ? analyzeOrderWeight(
                                  totalWeight,
                                  expectedWeightOz,
                                  structuredOutput?.items || [],
                                  toleranceOz
                                )
                              : null;

                          const getStatusColor = () => {
                            if (!analysis) return "bg-gray-50 border-gray-200";
                            switch (analysis.status) {
                              case "perfect":
                                return "bg-green-50 border-green-200";
                              case "underweight":
                                return "bg-red-50 border-red-300";
                              case "overweight":
                                return "bg-orange-50 border-orange-200";
                            }
                          };

                          return (
                            <div
                              className={cn(
                                "rounded-xl p-6 border-2",
                                getStatusColor()
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xl font-medium text-gray-700">
                                  Total Weight:
                                </span>
                                <span className="text-3xl font-bold text-gray-900">
                                  {totalWeight} oz
                                </span>
                              </div>
                              {/* Expected weight is now shown before input */}

                              {/* Immediate Analysis Feedback - only show after user has weighed something */}
                              {totalWeight > 0 && bagWeights.some(bag => bag.weight > 0) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  {analysis ? (
                                    <>
                                      {analysis.status === "perfect" && (
                                        <div className="flex items-center gap-2 text-green-700">
                                          <CheckCircle2 className="h-5 w-5" />
                                          <span className="font-medium">
                                            ✅ Ready for delivery
                                          </span>
                                        </div>
                                      )}

                                      {analysis.status === "underweight" && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-red-700">
                                            <AlertTriangle className="h-5 w-5" />
                                            <span className="font-bold">
                                              ⚠️ MISSING ITEMS
                                            </span>
                                          </div>
                                          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                                            <p className="text-red-800 font-medium text-sm">
                                              {analysis.message}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {analysis.status === "overweight" && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-orange-700">
                                            <AlertTriangle className="h-5 w-5" />
                                            <span className="font-medium">
                                              Extra weight detected
                                            </span>
                                          </div>
                                          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                                            <p className="text-orange-800 font-medium text-sm">
                                              {analysis.message}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    // No expected weight - just show ready to complete
                                    <div className="flex items-center gap-2 text-blue-700">
                                      <CheckCircle2 className="h-5 w-5" />
                                      <span className="font-medium">
                                        Weight recorded - Ready to complete
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Action Button - Changes based on weight analysis */}
                        {(() => {
                          const expectedWeightOz = selectedOrder.expected_weight
                            ? gramsToOunces(selectedOrder.expected_weight)
                            : 0;

                          // Only analyze if we have expected weight
                          const structuredOutput =
                            selectedOrder.structured_output as {
                              items?: Array<{
                                name: string;
                                quantity: number;
                                price: number;
                                modifiers?: Array<{
                                  name: string;
                                  price: number;
                                }>;
                              }>;
                            } | null;
                          const analysis =
                            totalWeight > 0 && expectedWeightOz > 0
                              ? analyzeOrderWeight(
                                  totalWeight,
                                  expectedWeightOz,
                                  structuredOutput?.items || [],
                                  toleranceOz
                                )
                              : null;

                          // Check if user has actually weighed any bag (not just packaging weight)
                          const hasActualWeight = bagWeights.some(bag => bag.weight > 0);

                          // If underweight AND user has actually weighed something, show re-weigh button with override option
                          if (analysis?.status === "underweight" && hasActualWeight) {
                            // Prepare weight sample data for all orders
                            const orderItemsUnderweight = (selectedOrder as { items?: Array<{ product_id: string; quantity: number; name: string }> }).items || [];
                            const isSingleProductUnderweight = orderItemsUnderweight.length === 1 && orderItemsUnderweight[0].quantity === 1;
                            const singleProductIdUnderweight = isSingleProductUnderweight ? orderItemsUnderweight[0].product_id : undefined;
                            const itemCountUnderweight = orderItemsUnderweight.reduce((sum, item) => sum + item.quantity, 0);
                            const itemsSummaryUnderweight = orderItemsUnderweight.map(item => `${item.quantity}x ${item.name}`).join(", ");

                            return (
                              <div className="space-y-4">
                                {/* Main action - Reweigh */}
                                <Button
                                  onClick={handleWeighAction}
                                  disabled={totalWeight === 0}
                                  className="w-full h-16 text-xl font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300"
                                >
                                  Re-weigh Order
                                </Button>

                                {/* Secondary action - Override (smaller, below) */}
                                <div className="text-center">
                                  <button
                                    type="button"
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                    onClick={() => setOverrideDialogOpen(true)}
                                  >
                                    Override and mark as Ready for Lockers
                                  </button>
                                </div>

                                {/* Save as Sample button - available for ALL orders */}
                                <Button
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await createWeightSample.mutateAsync({
                                        product_id: singleProductIdUnderweight,
                                        order_id: selectedOrder.id,
                                        weight: Math.round(ouncesToGrams(totalWeight)),
                                        item_count: itemCountUnderweight,
                                        is_single_product: isSingleProductUnderweight,
                                        check_number: selectedOrder.check_number,
                                        items_summary: itemsSummaryUnderweight,
                                      });
                                      toast.success("Weight sample saved for calibration");
                                    } catch (e) {
                                      console.error(e);
                                      toast.error("Failed to save weight sample");
                                    }
                                  }}
                                  disabled={createWeightSample.isPending}
                                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  {createWeightSample.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Scale className="h-4 w-4 mr-2" />
                                  )}
                                  Save as Weight Sample
                                </Button>
                              </div>
                            );
                          }

                          // Default: Ready for lockers (works for no expected weight too)
                          // Disabled if no actual weight has been recorded

                          // Prepare weight sample data for all orders
                          const orderItems = (selectedOrder as { items?: Array<{ product_id: string; quantity: number; name: string }> }).items || [];
                          const isSingleProductOrder = orderItems.length === 1 && orderItems[0].quantity === 1;
                          const singleProductId = isSingleProductOrder ? orderItems[0].product_id : undefined;
                          const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
                          const itemsSummary = orderItems.map(item => `${item.quantity}x ${item.name}`).join(", ");

                          return (
                            <div className="space-y-3">
                              <Button
                                onClick={async () => {
                                  try {
                                    await onOrderWeighed(
                                      selectedOrder.id,
                                      ouncesToGrams(totalWeight),
                                      "weighed"
                                    );
                                    resetWeighingState();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                disabled={!hasActualWeight}
                                className="w-full h-16 text-xl font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                              >
                                Ready for Lockers
                              </Button>

                              {/* Save as Sample button - available for ALL orders */}
                              {hasActualWeight && (
                                <Button
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await createWeightSample.mutateAsync({
                                        product_id: singleProductId,
                                        order_id: selectedOrder.id,
                                        weight: Math.round(ouncesToGrams(totalWeight)),
                                        item_count: itemCount,
                                        is_single_product: isSingleProductOrder,
                                        check_number: selectedOrder.check_number,
                                        items_summary: itemsSummary,
                                      });
                                      toast.success("Weight sample saved for calibration");
                                    } catch (e) {
                                      console.error(e);
                                      toast.error("Failed to save weight sample");
                                    }
                                  }}
                                  disabled={createWeightSample.isPending}
                                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  {createWeightSample.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Scale className="h-4 w-4 mr-2" />
                                  )}
                                  Save as Weight Sample
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* No weighing needed - Order already weighed or completed */}
              {selectedOrder.status !== "pending_weight" && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Order Already Processed
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {selectedOrder.status === "weighed"
                        ? "This order is ready for lockers"
                        : "This order has been completed"}
                    </p>
                    {(selectedOrder.status === "weighed" ||
                      selectedOrder.status === "completed") && (
                      <Button
                        variant="outline"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => setRevertDialogOpen(true)}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        {selectedOrder.status === "weighed"
                          ? "Revert to Pending"
                          : "Revert to Ready for Lockers"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select an order to weigh
              </h3>
              <p className="text-gray-500">
                Choose an order from the list to start the weighing process
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Weight Input Modal */}
      <WeightInputModal
        open={weightModalOpen}
        onOpenChange={setWeightModalOpen}
        bagNumber={selectedBagForWeighing?.number || 1}
        currentWeight={
          selectedBagForWeighing
            ? bagWeights.find((b) => b.id === selectedBagForWeighing.id)
                ?.weight || 0
            : 0
        }
        onWeightConfirm={handleWeightConfirm}
        totalBags={bagCount}
      />

      {/* Revert Order Status Confirmation Dialog */}
      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Undo2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <AlertDialogTitle>Revert Order Status</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedOrder?.status === "weighed"
                    ? "This will move the order back to pending weight"
                    : "This will move the order back to ready for lockers"}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="my-4 rounded-lg border p-4 bg-muted/50">
            <p className="text-sm">
              <strong>Order #{selectedOrder?.check_number}</strong> -{" "}
              {selectedOrder?.customer_name}
            </p>
          </div>

          <AlertDialogDescription>
            {selectedOrder?.status === "weighed" ? (
              <>
                This will clear the recorded weight and you&apos;ll need to
                weigh this order again.
              </>
            ) : (
              <>
                This will move the order back to &quot;Ready for Lockers&quot;
                status.
              </>
            )}
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={revertOrderStatus.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedOrderId) return;
                try {
                  await revertOrderStatus.mutateAsync(selectedOrderId);
                  toast.success("Order status reverted successfully");
                  setRevertDialogOpen(false);
                  // Clear local weighing state when reverting
                  if (selectedOrder?.status === "weighed") {
                    clearWeighingProgress(selectedOrderId);
                    resetWeighingState();
                  }
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to revert order status"
                  );
                }
              }}
              disabled={revertOrderStatus.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {revertOrderStatus.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Override Underweight Order Confirmation Dialog */}
      <AlertDialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle>Override Weight Check</AlertDialogTitle>
                <AlertDialogDescription>
                  This order appears to be missing items
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="my-4 rounded-lg border border-red-200 p-4 bg-red-50">
            <p className="text-sm text-red-800">
              The actual weight is significantly below the expected weight. This may indicate missing items in the order.
            </p>
          </div>

          <AlertDialogDescription>
            Are you sure you want to mark this order as <strong>Ready for Lockers</strong> anyway?
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedOrderId) return;
                try {
                  await onOrderWeighed(
                    selectedOrderId,
                    ouncesToGrams(totalWeight),
                    "weighed"
                  );
                  resetWeighingState();
                  setOverrideDialogOpen(false);
                  toast.success("Order marked as Ready for Lockers (override)");
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to override order"
                  );
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Confirm Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Camera Capture Modal for Visual Verification */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleVisualVerification}
        isProcessing={visualVerification.isPending}
      />
    </div>
  );
}
