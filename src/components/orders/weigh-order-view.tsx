"use client";

import { useState } from "react";
import { useRealTimeOrders, useOrder } from "@/hooks/use-orders";
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
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled";
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

export function WeighOrderView({ 
  selectedOrderId, 
  onBack, 
  onOrderSelect,
  onOrderWeighed 
}: WeighOrderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "delivery" | "takeout">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending_weight" | "weighed">("pending_weight");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "customer">("newest");
  const [selectedReadyIds, setSelectedReadyIds] = useState<Set<string>>(new Set());
  
  // Weighing state
  const [bagCount, setBagCount] = useState<number>(1);
  const [bagWeights, setBagWeights] = useState<BagWeight[]>([{ id: "bag-1", weight: 0 }]);
  const [bagPackaging, setBagPackaging] = useState<Record<string, "none" | "paper" | "plastic" | "box">>({ "bag-1": "none" });
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedBagForWeighing, setSelectedBagForWeighing] = useState<{ id: string; number: number } | null>(null);

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



  const orders = ordersData?.orders || [];
  const displayOrders = (() => {
    if (selectedStatus === "weighed") {
      return [...orders].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
    if (selectedStatus === "all") {
      const weighedFirst = orders
        .filter(o => o.status === "weighed")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const pending = orders
        .filter(o => o.status === "pending_weight")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const others = orders
        .filter(o => o.status !== "weighed" && o.status !== "pending_weight")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return [...weighedFirst, ...pending, ...others];
    }
    return orders;
  })();

  const toggleSelectReady = (orderId: string) => {
    setSelectedReadyIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllReady = () => {
    setSelectedReadyIds(new Set(displayOrders.filter(o => o.status === "weighed").map(o => o.id)));
  };

  const clearReadySelection = () => setSelectedReadyIds(new Set());

  // Add bag
  const addBag = () => {
    if (bagCount < 10) {
      const newBagCount = bagCount + 1;
      setBagCount(newBagCount);
      const id = `bag-${newBagCount}`;
      setBagWeights(prev => [...prev, { id, weight: 0 }]);
      setBagPackaging(prev => ({ ...prev, [id]: "none" }));
    }
  };

  // Remove bag
  const removeBag = () => {
    if (bagCount > 1) {
      const newBagCount = bagCount - 1;
      setBagCount(newBagCount);
      setBagWeights(prev => prev.slice(0, newBagCount));
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
    }
  };

  // Update individual bag weight
  const updateBagWeight = (bagId: string, weight: number) => {
    setBagWeights(prev => 
      prev.map(bag => 
        bag.id === bagId ? { ...bag, weight } : bag
      )
    );
  };

  // Calculate total weight
  const totalWeight = bagWeights.reduce((sum, bag) => sum + bag.weight, 0);

  // Handle complete weighing or re-weigh
  const handleWeighAction = () => {
    if (!selectedOrderId || totalWeight === 0) return;
    
    const expectedWeightOz = selectedOrder?.expected_weight ? gramsToOunces(selectedOrder.expected_weight) : 0;
    
    // Only analyze if we have expected weight
    if (expectedWeightOz > 0) {
      const toleranceOz = gramsToOunces(100);
      const structuredOutput = selectedOrder?.structured_output as { items?: Array<{ name: string; quantity: number; price: number; modifiers?: Array<{ name: string; price: number }> }> } | null;
      const analysis = analyzeOrderWeight(totalWeight, expectedWeightOz, structuredOutput?.items || [], toleranceOz);
      
      if (analysis.status === 'underweight') {
        // Don't complete - just reset for re-weighing
        resetWeighingState();
        return;
      }
    }
    
    // Complete weighing (for perfect/overweight orders or orders without expected weight)
    const weightInGrams = ouncesToGrams(totalWeight);
    onOrderWeighed(selectedOrderId, weightInGrams);
    
    // Auto-advance to next pending order
    const nextPendingOrder = orders.find(order => 
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
  };

  const getOrderItems = (order: Order) => {
    const items = order.structured_output?.items || [];
    if (items.length === 0) return "No items";
    
    return items
      .slice(0, 2)
      .map(item => {
        const modifiersText = item.modifiers && item.modifiers.length > 0 
          ? ` (+${item.modifiers.length})` 
          : "";
        return `${item.quantity}x ${item.name}${modifiersText}`;
      })
      .join(", ") + (items.length > 2 ? "..." : "");
  };

  const getDueTime = (createdAt: string, status: string): { time: string; isUrgent: boolean } => {
    // Completed orders are never urgent
    if (status === "completed" || status === "weighed") {
      return { time: "Completed", isUrgent: false };
    }
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
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
        isUrgent: false 
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
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
                className="h-8 px-3 text-xs font-medium"
              >
                All
              </Button>
              <Button
                variant={selectedStatus === "pending_weight" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("pending_weight")}
                className="h-8 px-3 text-xs font-medium"
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === "weighed" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("weighed")}
                className="h-8 px-3 text-xs font-medium"
              >
                Ready for Lockers
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
                className="h-8 px-3 text-xs font-medium"
              >
                All Types
              </Button>
              <Button
                variant={selectedType === "delivery" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("delivery")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedType === "delivery" 
                    ? "bg-indigo-600 text-white border-indigo-600" 
                    : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                )}
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
                  selectedType === "takeout" 
                    ? "bg-emerald-600 text-white border-emerald-600" 
                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                )}
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
          {readyOrdersData?.orders && readyOrdersData.orders.length > 0 && selectedStatus !== "weighed" && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
              <div className="text-sm text-yellow-800 font-medium">
                {readyOrdersData.orders.length} order{readyOrdersData.orders.length > 1 ? 's' : ''} ready for lockers
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelectedStatus("weighed")}>
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
                  onChange={(e) => (e.target.checked ? selectAllReady() : clearReadySelection())}
                />
                <span className="text-sm text-blue-900 font-medium">Select All</span>
                <span className="text-sm text-blue-700">{selectedReadyIds.size} selected</span>
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
            const { time: dueTime, isUrgent } = getDueTime(order.created_at, order.status);
            const isSelected = selectedOrderId === order.id;
            
            return (
              <div
                key={order.id}
                onClick={() => onOrderSelect(order.id)}
                className={cn(
                  "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100",
                  isSelected && "bg-blue-50 border-blue-200",
                  isUrgent && order.status === "pending_weight" && "border-l-4 border-l-red-400",
                  order.status === "completed" && "bg-green-50 border-green-100 opacity-75"
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
                    <span className="font-medium text-sm">#{order.check_number}</span>
                    {order.type === "delivery" && (
                      <Truck className="h-3 w-3 text-gray-400" />
                    )}
                    {order.type === "takeout" && (
                      <Package className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isUrgent && order.status === "pending_weight" && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {dueTime}
                      </Badge>
                    )}
                    {order.status === "pending_weight" && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Awaiting
                      </Badge>
                    )}
                    {order.status === "weighed" && (
                      <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-300 bg-green-50">
                        ✓ Ready
                      </Badge>
                    )}
                    {order.status === "completed" && (
                      <Badge variant="outline" className="text-xs px-1 py-0 text-blue-600 border-blue-300 bg-blue-50">
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
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Order #{selectedOrder.check_number}
                  </h1>
                  <p className="text-gray-600">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_address && (
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedOrder.customer_address}
                    </p>
                  )}
                </div>

                {/* Order Items - MOVED TO BOTTOM */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const structuredOutput = selectedOrder.structured_output as { items?: Array<{ name: string; quantity: number; price: number; modifiers?: Array<{ name: string; price: number }> }> } | null;
                      return structuredOutput?.items?.map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.name}</span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="ml-4 mt-1 space-y-0.5">
                              {item.modifiers.map((modifier, modIndex) => (
                                <div key={modIndex} className="text-sm text-gray-600 flex items-center gap-1">
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
                      <div className="text-center text-gray-500 py-4">
                        No items found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content - Weighing First, Items Second */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Weighing Section - MOVED TO TOP */}
                {selectedOrder.status === "pending_weight" && (
                  <div className="space-y-6">
                    <Card>
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
                            {bagCount} bag{bagCount > 1 ? 's' : ''}
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
                    <CardContent className="space-y-6">
                      {/* Expected Weight Display */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium text-blue-900">Expected Weight:</span>
                          <span className="text-xl font-bold text-blue-900">
                            {selectedOrder.expected_weight ? `${gramsToOunces(selectedOrder.expected_weight)} oz` : "Not calculated"}
                          </span>
                        </div>
                      </div>

                      {/* Bag Weight Inputs - Clean Layout */}
                      <div className="grid gap-4">
                        {bagWeights.map((bag, index) => (
                          <div key={bag.id} className="flex items-center gap-4">
                            <div className="text-lg font-medium text-gray-700 w-20">
                              Bag {index + 1}
                            </div>
                            {/* Packaging selector */}
                            <select
                              className="h-10 border rounded px-2 text-sm text-gray-700"
                              value={bagPackaging[bag.id] || "none"}
                              onChange={(e) => setBagPackaging(prev => ({ ...prev, [bag.id]: e.target.value as any }))}
                            >
                              <option value="none">No packaging</option>
                              <option value="paper">Paper bag</option>
                              <option value="plastic">Plastic bag</option>
                              <option value="box">Box</option>
                            </select>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 h-16 text-lg justify-center transition-all border-2",
                                bag.weight > 0 
                                  ? "bg-green-50 border-green-200 text-green-700" 
                                  : "border-dashed border-gray-300 text-gray-500 hover:border-gray-400"
                              )}
                              onClick={() => handleOpenWeightModal(bag.id, index + 1)}
                            >
                              {bag.weight > 0 ? `${bag.weight} oz` : "Tap to weigh"}
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
                        ))}
                      </div>

                      <Separator />

                      {/* Total Weight Display with Analysis */}
                      {(() => {
                        const expectedWeightOz = selectedOrder.expected_weight ? gramsToOunces(selectedOrder.expected_weight) : 0;
                        const toleranceOz = gramsToOunces(100); // 100g tolerance
                        // Skip analysis if no expected weight - just allow completion
                        const structuredOutput = selectedOrder.structured_output as { items?: Array<{ name: string; quantity: number; price: number; modifiers?: Array<{ name: string; price: number }> }> } | null;
                        const analysis = totalWeight > 0 && expectedWeightOz > 0 
                          ? analyzeOrderWeight(totalWeight, expectedWeightOz, structuredOutput?.items || [], toleranceOz)
                          : null;
                        
                        const getStatusColor = () => {
                          if (!analysis) return "bg-gray-50 border-gray-200";
                          switch (analysis.status) {
                            case 'perfect': return "bg-green-50 border-green-200";
                            case 'underweight': return "bg-red-50 border-red-300";
                            case 'overweight': return "bg-orange-50 border-orange-200";
                          }
                        };

                        return (
                          <div className={cn("rounded-xl p-6 border-2", getStatusColor())}>
                            <div className="flex justify-between items-center">
                              <span className="text-xl font-medium text-gray-700">Total Weight:</span>
                              <span className="text-3xl font-bold text-gray-900">{totalWeight} oz</span>
                            </div>
                                                    {/* Expected weight is now shown before input */}
                            
                            {/* Immediate Analysis Feedback */}
                            {totalWeight > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                {analysis ? (
                                  <>
                                    {analysis.status === 'perfect' && (
                                      <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">✅ Ready for delivery</span>
                                      </div>
                                    )}
                                    
                                    {analysis.status === 'underweight' && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-red-700">
                                          <AlertTriangle className="h-5 w-5" />
                                          <span className="font-bold">⚠️ MISSING ITEMS</span>
                                        </div>
                                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                                          <p className="text-red-800 font-medium text-sm">
                                            {analysis.message}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {analysis.status === 'overweight' && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-orange-700">
                                          <AlertTriangle className="h-5 w-5" />
                                          <span className="font-medium">Extra weight detected</span>
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
                                    <span className="font-medium">Weight recorded - Ready to complete</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Action Button - Changes based on weight analysis */}
                      {(() => {
                        const expectedWeightOz = selectedOrder.expected_weight ? gramsToOunces(selectedOrder.expected_weight) : 0;
                        const toleranceOz = gramsToOunces(100);
                        
                        // Only analyze if we have expected weight
                        const structuredOutput = selectedOrder.structured_output as { items?: Array<{ name: string; quantity: number; price: number; modifiers?: Array<{ name: string; price: number }> }> } | null;
                        const analysis = totalWeight > 0 && expectedWeightOz > 0 
                          ? analyzeOrderWeight(totalWeight, expectedWeightOz, structuredOutput?.items || [], toleranceOz)
                          : null;
                        
                        // If underweight, show re-weigh button
                        if (analysis?.status === 'underweight') {
                          return (
                            <Button
                              onClick={handleWeighAction}
                              disabled={totalWeight === 0}
                              className="w-full h-16 text-xl font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300"
                            >
                              Re-weigh Order
                            </Button>
                          );
                        }
                        
                        // Default: Ready for lockers (works for no expected weight too)
                        return (
                          <Button
                            onClick={async () => {
                              try {
                                await onOrderWeighed(selectedOrder.id, ouncesToGrams(totalWeight), "weighed");
                                resetWeighingState();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            disabled={totalWeight === 0}
                            className="w-full h-16 text-xl font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                          >
                            Ready for Lockers
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  </div>
                )}
              </div>
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
            ? bagWeights.find(b => b.id === selectedBagForWeighing.id)?.weight || 0 
            : 0
        }
        onWeightConfirm={handleWeightConfirm}
      />
    </div>
  );
}