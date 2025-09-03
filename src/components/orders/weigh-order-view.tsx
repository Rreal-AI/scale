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
  onOrderWeighed: (orderId: string, totalWeight: number) => void;
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
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending_weight">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "customer">("newest");
  
  // Weighing state
  const [bagCount, setBagCount] = useState<number>(1);
  const [bagWeights, setBagWeights] = useState<BagWeight[]>([{ id: "bag-1", weight: 0 }]);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedBagForWeighing, setSelectedBagForWeighing] = useState<{ id: string; number: number } | null>(null);

  // Fetch orders for sidebar
  const { data: ordersData } = useRealTimeOrders({
    limit: 100,
    search: searchQuery || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    sort_by: sortBy === "customer" ? "customer_name" : "created_at",
    sort_order: sortBy === "oldest" ? "asc" : "desc",
  });

  // Fetch selected order details
  const { data: selectedOrderData } = useOrder(selectedOrderId || "");
  const selectedOrder = selectedOrderData?.order;

  const orders = ordersData?.orders || [];

  // Add bag
  const addBag = () => {
    if (bagCount < 10) {
      const newBagCount = bagCount + 1;
      setBagCount(newBagCount);
      setBagWeights(prev => [...prev, { id: `bag-${newBagCount}`, weight: 0 }]);
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
    const toleranceOz = gramsToOunces(100);
    const analysis = analyzeOrderWeight(totalWeight, expectedWeightOz, selectedOrder?.structured_output?.items || [], toleranceOz);
    
    if (analysis.status === 'underweight') {
      // Don't complete - just reset for re-weighing
      resetWeighingState();
      return;
    }
    
    // Complete weighing for perfect or overweight orders
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

  const getDueTime = (createdAt: string): { time: string; isUrgent: boolean } => {
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
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold text-gray-900">Orders</h2>
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
                className="h-8 px-3 text-xs font-medium"
              >
                <Truck className="h-3 w-3 mr-1" />
                Delivery
              </Button>
              <Button
                variant={selectedType === "takeout" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("takeout")}
                className="h-8 px-3 text-xs font-medium"
              >
                <Package className="h-3 w-3 mr-1" />
                Pickup
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto">
          {orders.map((order) => {
            const { time: dueTime, isUrgent } = getDueTime(order.created_at);
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
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatPrice(selectedOrder.total_amount)}
                  </div>
                  {selectedOrder.expected_weight && (
                    <div className="text-sm text-gray-500">
                      Expected: {gramsToOunces(selectedOrder.expected_weight)} oz
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Items List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedOrder.structured_output?.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.name}</span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="ml-6 mt-1 space-y-1">
                              {item.modifiers.map((modifier, modIndex) => (
                                <div key={modIndex} className="text-sm text-gray-600">
                                  + {modifier.name}
                                  {modifier.price > 0 && (
                                    <span className="ml-2 text-gray-500">
                                      {formatPrice(modifier.price * 100)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {formatPrice(item.price * item.quantity * 100)}
                          </span>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-gray-500 py-4">
                        No items found
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weighing Section */}
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
                      {/* Bag Weight Inputs - Clean Layout */}
                      <div className="grid gap-4">
                        {bagWeights.map((bag, index) => (
                          <div key={bag.id} className="flex items-center gap-4">
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
                        const analysis = totalWeight > 0 && expectedWeightOz > 0 
                          ? analyzeOrderWeight(totalWeight, expectedWeightOz, selectedOrder.structured_output?.items || [], toleranceOz)
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
                            {selectedOrder.expected_weight && (
                              <div className="flex justify-between items-center mt-3 text-lg">
                                <span className="text-gray-500">Expected:</span>
                                <span className="text-gray-700 font-medium">{expectedWeightOz} oz</span>
                              </div>
                            )}
                            
                            {/* Immediate Analysis Feedback */}
                            {analysis && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
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
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Action Button - Changes based on weight analysis */}
                      {(() => {
                        const expectedWeightOz = selectedOrder.expected_weight ? gramsToOunces(selectedOrder.expected_weight) : 0;
                        const toleranceOz = gramsToOunces(100);
                        const analysis = totalWeight > 0 && expectedWeightOz > 0 
                          ? analyzeOrderWeight(totalWeight, expectedWeightOz, selectedOrder.structured_output?.items || [], toleranceOz)
                          : null;
                        
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
                        
                        return (
                          <Button
                            onClick={handleWeighAction}
                            disabled={totalWeight === 0}
                            className="w-full h-16 text-xl font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                          >
                            Complete Weighing
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