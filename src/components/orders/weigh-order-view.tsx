"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRealTimeOrders, useOrder, useRevertOrderStatus } from "@/hooks/use-orders";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import {
  ArrowLeft,
  Search,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Undo2,
  Loader2,
  Camera,
  Eye,
  ChevronLeft,
  ChevronRight,
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
import { SidebarTrigger } from "@/components/ui/sidebar";

interface Order {
  id: string;
  status: "pending_weight" | "weighed" | "completed" | "cancelled" | "archived";
  type: "delivery" | "takeout";
  check_number: string;
  customer_name: string;
  customer_address?: string;
  total_amount: number;
  expected_weight?: number;
  actual_weight?: number;
  visual_verification_status?: "pending" | "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image" | null;
  created_at: string;
  updated_at: string;
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
    "all" | "pending" | "ready_for_lockers"
  >("pending");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "customer">(
    "newest"
  );
  const [selectedReadyIds, setSelectedReadyIds] = useState<Set<string>>(
    new Set()
  );
  
  // Dialogs state
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);

  // Revert order status hook
  const revertOrderStatus = useRevertOrderStatus();

  // Visual verification state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraOrderId, setCameraOrderId] = useState<string | null>(null);
  const visualVerification = useVisualVerification();

  // Mobile state
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const touchStartX = useRef<number | null>(null);

  // Swipe to Ready state
  const [swipeOrderId, setSwipeOrderId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  // Track previous order states for auto-actions
  const prevOrderStatesRef = useRef<Map<string, string | null>>(new Map());

  // Alert sound function for negative verification results
  const playAlertSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);
    } catch (e) {
      console.error('Could not play alert sound:', e);
    }
  }, []);

  // Handler for quick camera from list (without entering detail)
  const handleQuickCamera = useCallback((orderId: string) => {
    setCameraOrderId(orderId);
    setCameraOpen(true);
  }, []);

  // Handler for visual verification - closes modal immediately, processes in background
  const handleVisualVerification = async (images: string[]) => {
    const targetOrderId = cameraOrderId || selectedOrderId;
    if (!targetOrderId) return;

    // Close modal immediately
    setCameraOpen(false);
    toast.info("Visual verification started. Processing in background...");

    // Volver al listado en mobile después de verificar
    if (isMobile) {
      setMobileView("list");
    }

    // Clear cameraOrderId if it was a quick camera action
    if (cameraOrderId) {
      setCameraOrderId(null);
    }

    try {
      await visualVerification.mutateAsync({
        orderId: targetOrderId,
        images,
      });
    } catch (error) {
      toast.error("Error starting visual verification");
      console.error(error);
    }
  };

  // Fetch orders for sidebar - get all pending_weight and weighed orders
  const { data: ordersData } = useRealTimeOrders({
    limit: 100,
    search: searchQuery || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    // Don't filter by status in API - we filter locally for the new tab structure
    sort_by: sortBy === "customer" ? "customer_name" : "created_at",
    sort_order: sortBy === "oldest" ? "asc" : "desc",
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

  // Helper to check if order is "checked" (has weight OR visual verification)
  const isOrderChecked = useCallback((order: Order): boolean => {
    const hasWeight = (order.actual_weight || 0) > 0;
    const hasVisualVerification = ['pending', 'verified', 'missing_items', 'extra_items', 'uncertain', 'wrong_image']
      .includes(order.visual_verification_status || '');
    return hasWeight || hasVisualVerification;
  }, []);

  // Helper to check if order has a PROBLEMATIC verification status (for Flagged tab)
  const isOrderFlagged = useCallback((order: Order): boolean => {
    return ['missing_items', 'extra_items', 'uncertain', 'wrong_image']
      .includes(order.visual_verification_status || '');
  }, []);

  // Auto-abrir cámara cuando se selecciona una orden PENDING (desktop)
  useEffect(() => {
    if (!isMobile && selectedOrderId && selectedOrder) {
      // Solo abrir si la orden no tiene verificación visual Y no está flagged
      // (si está flagged, queremos que el usuario vea los errores primero)
      if (!isOrderChecked(selectedOrder as Order) && !isOrderFlagged(selectedOrder as Order)) {
        // Pequeño delay para que la UI se renderice primero
        const timer = setTimeout(() => setCameraOpen(true), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedOrderId, selectedOrder, isMobile, isOrderChecked, isOrderFlagged]);

  // Helper to get verification style (badge and border colors)
  const getVerificationStyle = (status: string | null | undefined) => {
    switch (status) {
      case 'verified':
        return {
          label: 'Approved',
          badgeClass: 'text-green-700 bg-green-100 border-green-300',
          borderClass: 'border-l-4 border-l-green-500'
        };
      case 'wrong_image':
        return {
          label: 'Wrong photo',
          badgeClass: 'text-orange-700 bg-orange-100 border-orange-300',
          borderClass: 'border-l-4 border-l-orange-500'
        };
      case 'missing_items':
        return {
          label: 'Missing items',
          badgeClass: 'text-red-700 bg-red-100 border-red-300',
          borderClass: 'border-l-4 border-l-red-500'
        };
      case 'extra_items':
        return {
          label: 'Extra items',
          badgeClass: 'text-yellow-700 bg-yellow-100 border-yellow-300',
          borderClass: 'border-l-4 border-l-yellow-500'
        };
      case 'uncertain':
        return {
          label: 'Uncertain',
          badgeClass: 'text-gray-700 bg-gray-100 border-gray-300',
          borderClass: 'border-l-4 border-l-gray-500'
        };
      default:
        return null;
    }
  };

  // Helper to calculate visual verification processing time in seconds
  const getProcessingTimeSeconds = (order: Order): number | undefined => {
    if (!order.visual_verified_at || !order.updated_at) return undefined;
    const start = new Date(order.updated_at).getTime();
    const end = new Date(order.visual_verified_at).getTime();
    const durationMs = end - start;
    if (durationMs < 0) return undefined;
    return durationMs / 1000;
  };

  const orders = ordersData?.orders || [];

  // Auto-Ready for approved orders + Sound alert for negative results
  useEffect(() => {
    const prevStates = prevOrderStatesRef.current;

    orders.forEach(order => {
      const prevStatus = prevStates.get(order.id);
      const currentStatus = order.visual_verification_status as string | null | undefined;

      // Only act if status changed (and it's not the initial load)
      if (prevStatus !== undefined && prevStatus !== currentStatus && currentStatus) {
        // Auto-mark as Ready if Approved
        if (currentStatus === 'verified') {
          onOrderWeighed(order.id, 0, "weighed");
          toast.success(`Order #${order.check_number} approved and ready`);
        }

        // Sound alert for negative results
        if (currentStatus === 'missing_items' || currentStatus === 'wrong_image') {
          playAlertSound();
          toast.error(`Order #${order.check_number}: ${currentStatus === 'missing_items' ? 'Missing items' : 'Wrong photo'}`);
        }
      }

      prevStates.set(order.id, currentStatus ?? null);
    });
  }, [orders, onOrderWeighed, playAlertSound]);

  // Filter orders based on selected tab
  const displayOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      switch (selectedStatus) {
        case 'pending':
          // Pending: ALL orders with pending_weight status (including flagged ones)
          return order.status === 'pending_weight';
        case 'ready_for_lockers':
          // Ready for Lockers: weighed status
          return order.status === 'weighed';
        case 'all':
        default:
          return order.status === 'pending_weight' || order.status === 'weighed';
      }
    });

    // Sort based on tab
    if (selectedStatus === 'pending') {
      // Flagged orders first, then by created_at
      return [...filtered].sort((a, b) => {
        const aFlagged = isOrderFlagged(a);
        const bFlagged = isOrderFlagged(b);
        if (aFlagged && !bFlagged) return -1;
        if (!aFlagged && bFlagged) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    if (selectedStatus === 'ready_for_lockers') {
      return [...filtered].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
    if (selectedStatus === 'all') {
      // Ready first, then checked, then pending
      const ready = filtered.filter(o => o.status === 'weighed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const checked = filtered.filter(o => o.status === 'pending_weight' && isOrderChecked(o))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const pending = filtered.filter(o => o.status === 'pending_weight' && !isOrderChecked(o))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return [...ready, ...checked, ...pending];
    }
    return filtered;
  }, [orders, selectedStatus, isOrderChecked, isOrderFlagged]);

  // Count orders by tab for badges
  const tabCounts = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending_weight').length;
    const ready = orders.filter(o => o.status === 'weighed').length;
    return { pending, ready };
  }, [orders]);

  // Mobile navigation functions
  const currentOrderIndex = displayOrders.findIndex(o => o.id === selectedOrderId);
  const canGoNext = currentOrderIndex < displayOrders.length - 1;
  const canGoPrev = currentOrderIndex > 0;

  const goToNextOrder = useCallback(() => {
    if (canGoNext) {
      onOrderSelect(displayOrders[currentOrderIndex + 1].id);
    }
  }, [canGoNext, currentOrderIndex, displayOrders, onOrderSelect]);

  const goToPrevOrder = useCallback(() => {
    if (canGoPrev) {
      onOrderSelect(displayOrders[currentOrderIndex - 1].id);
    }
  }, [canGoPrev, currentOrderIndex, displayOrders, onOrderSelect]);

  // Handle mobile order selection
  const handleMobileOrderSelect = useCallback((orderId: string) => {
    onOrderSelect(orderId);
    setMobileView("detail");

    // Auto-abrir cámara si la orden no tiene verificación visual Y no está flagged
    // (si está flagged, queremos que el usuario vea los errores primero)
    const order = orders.find(o => o.id === orderId);
    if (order && !isOrderChecked(order) && !isOrderFlagged(order)) {
      // Pequeño delay para que la UI se renderice primero
      setTimeout(() => setCameraOpen(true), 100);
    }
  }, [onOrderSelect, orders, isOrderChecked, isOrderFlagged]);

  // Handle swipe gestures for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next order
        goToNextOrder();
      } else {
        // Swipe right - previous order
        goToPrevOrder();
      }
    }

    touchStartX.current = null;
  }, [goToNextOrder, goToPrevOrder]);

  // Swipe handlers for cards to mark as Ready
  const handleCardSwipeStart = useCallback((e: React.TouchEvent, orderId: string, canSwipe: boolean) => {
    if (!canSwipe) return;
    e.stopPropagation();
    swipeStartX.current = e.touches[0].clientX;
    setSwipeOrderId(orderId);
  }, []);

  const handleCardSwipeMove = useCallback((e: React.TouchEvent, orderId: string) => {
    if (swipeOrderId !== orderId || swipeStartX.current === null) return;
    e.stopPropagation();
    const diff = swipeStartX.current - e.touches[0].clientX;
    // Solo permitir swipe a la izquierda
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 100));
    }
  }, [swipeOrderId]);

  const handleCardSwipeEnd = useCallback(async (orderId: string) => {
    if (swipeOrderId !== orderId) return;

    // Si el swipe fue suficiente, marcar como Ready
    if (swipeOffset > 60) {
      try {
        await onOrderWeighed(orderId, 0, "weighed");
        toast.success("Order marked as Ready for Lockers");
      } catch (e) {
        console.error(e);
        toast.error("Failed to mark order as ready");
      }
    }

    // Reset swipe state
    setSwipeOffset(0);
    setSwipeOrderId(null);
    swipeStartX.current = null;
  }, [swipeOrderId, swipeOffset, onOrderWeighed]);

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

  // Mobile Layout
  if (isMobile) {
    // Mobile List View
    if (mobileView === "list") {
      return (
        <div className="flex flex-col h-screen bg-gray-50">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <SidebarTrigger className="p-2" />
            <h1 className="text-lg font-semibold">Orders</h1>
            <div className="w-10" />
          </div>

          {/* Search */}
          <div className="p-3 bg-white border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 p-3 bg-white border-b border-gray-100 overflow-x-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStatus("pending")}
              className={cn(
                "h-9 px-4 whitespace-nowrap",
                selectedStatus === "pending"
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : ""
              )}
            >
              Pending {tabCounts.pending > 0 && `(${tabCounts.pending})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStatus("ready_for_lockers")}
              className={cn(
                "h-9 px-4 whitespace-nowrap",
                selectedStatus === "ready_for_lockers"
                  ? "bg-green-100 text-green-700 border-green-300"
                  : ""
              )}
            >
              Ready {tabCounts.ready > 0 && `(${tabCounts.ready})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStatus("all")}
              className={cn(
                "h-9 px-4 whitespace-nowrap",
                selectedStatus === "all"
                  ? "bg-gray-900 text-white border-gray-900"
                  : ""
              )}
            >
              All
            </Button>
          </div>

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto">
            {displayOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p>No orders</p>
              </div>
            ) : (
              displayOrders.map((order) => {
                const visualStatus = order.visual_verification_status as
                  | "pending" | "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image" | null;
                const canSwipe = visualStatus === "verified";
                const isBeingSwiped = swipeOrderId === order.id;

                return (
                  <div key={order.id} className="relative overflow-hidden">
                    {/* Swipe background - green check */}
                    {canSwipe && (
                      <div
                        className="absolute inset-0 bg-green-500 flex items-center justify-end pr-6"
                        style={{ opacity: isBeingSwiped ? Math.min(swipeOffset / 60, 1) : 0 }}
                      >
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <CheckCircle2 className="h-6 w-6" />
                          <span>Ready</span>
                        </div>
                      </div>
                    )}
                    {/* Card content */}
                    <div
                      onClick={() => !isBeingSwiped && handleMobileOrderSelect(order.id)}
                      onTouchStart={(e) => handleCardSwipeStart(e, order.id, canSwipe)}
                      onTouchMove={(e) => handleCardSwipeMove(e, order.id)}
                      onTouchEnd={() => handleCardSwipeEnd(order.id)}
                      style={{
                        transform: isBeingSwiped ? `translateX(-${swipeOffset}px)` : 'translateX(0)',
                        transition: isBeingSwiped ? 'none' : 'transform 0.2s ease-out',
                      }}
                      className={cn(
                        "p-4 border-b border-gray-100 cursor-pointer active:bg-gray-100 relative",
                        order.id === selectedOrderId && "bg-blue-50",
                        isOrderFlagged(order) ? "bg-red-50 border-l-4 border-l-red-500" : "bg-white",
                        !isOrderFlagged(order) && getVerificationStyle(order.visual_verification_status)?.borderClass
                      )}
                    >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">#{order.check_number}</span>
                        {order.type === "delivery" ? (
                          <Truck className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Package className="h-4 w-4 text-green-500" />
                        )}
                        {/* Visual verification status indicator */}
                        {visualStatus === "pending" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {visualStatus === "verified" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {(visualStatus === "missing_items" || visualStatus === "extra_items" || visualStatus === "wrong_image") && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {/* Quick camera button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleQuickCamera(order.id);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleQuickCamera(order.id);
                        }}
                        className="h-10 w-10 rounded-full bg-blue-50 hover:bg-blue-100 touch-manipulation"
                      >
                        <Camera className="h-5 w-5 text-blue-600" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate max-w-[50%]">{order.customer_name}</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const verificationStyle = getVerificationStyle(order.visual_verification_status);
                          if (verificationStyle) {
                            return (
                              <Badge variant="outline" className={cn("text-xs", verificationStyle.badgeClass)}>
                                {verificationStyle.label}
                              </Badge>
                            );
                          }
                          // Solo mostrar Awaiting si no tiene verificación
                          if (order.status === "pending_weight") {
                            return (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                                Awaiting
                              </Badge>
                            );
                          }
                          if (order.status === "weighed") {
                            return (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                Weighed
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        <span className="font-medium">{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // Mobile Detail View
    return (
      <div
        className="flex flex-col h-screen bg-gray-50"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Detail Header */}
        <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1 text-blue-600"
          >
            <ChevronLeft className="h-5 w-5" />
            Atrás
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold">#{selectedOrder?.check_number}</span>
            {selectedOrder?.type === "delivery" ? (
              <Truck className="h-4 w-4 text-blue-500" />
            ) : (
              <Package className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className="text-sm text-gray-500">
            {currentOrderIndex + 1}/{displayOrders.length}
          </div>
        </div>

        {/* Mobile Detail Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedOrder ? (
            <div className="space-y-4">
              {/* Customer Info Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{selectedOrder.customer_name}</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        selectedOrder.status === "pending_weight" && "bg-orange-100 text-orange-700",
                        selectedOrder.status === "weighed" && "bg-green-100 text-green-700"
                      )}
                    >
                      {selectedOrder.status === "pending_weight" ? "Pending" : "Weighed"}
                    </Badge>
                  </div>
                  {selectedOrder.customer_address && (
                    <p className="text-sm text-gray-600">{selectedOrder.customer_address}</p>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className="text-gray-600">Total</span>
                    <span className="text-lg font-bold">{formatPrice(selectedOrder.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {(selectedOrder.structured_output as Order["structured_output"])?.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{item.quantity}x</span>{" "}
                        <span>{item.name}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.modifiers.map(m => m.name).join(", ")}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-600">{formatPrice(item.price * 100)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Visual Verification Section */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Visual Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {(() => {
                    const visualStatus = selectedOrder.visual_verification_status as
                      | "pending" | "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image" | null;
                    const visualResultData = selectedOrder.visual_verification_result as VisualVerificationResult | null;

                    if (visualStatus === "pending") {
                      return (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-blue-700">Processing...</span>
                        </div>
                      );
                    }

                    if (visualStatus && visualResultData) {
                      return (
                        <VisualVerificationResultCard
                          result={visualResultData}
                          status={visualStatus as "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image"}
                          processingTimeSeconds={getProcessingTimeSeconds(selectedOrder as Order)}
                          onRetry={() => setCameraOpen(true)}
                        />
                      );
                    }

                    return (
                      <Button
                        variant="outline"
                        onClick={() => setCameraOpen(true)}
                        className="w-full h-12 border-blue-300 text-blue-700"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Verify with Photo
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an order
            </div>
          )}
        </div>

        {/* Mobile Navigation Footer */}
        <div className="flex items-center justify-between p-3 bg-white border-t border-gray-200 safe-area-inset-bottom">
          <Button
            variant="outline"
            size="lg"
            onClick={goToPrevOrder}
            disabled={!canGoPrev}
            className="flex-1 mr-2 h-12"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={goToNextOrder}
            disabled={!canGoNext}
            className="flex-1 ml-2 h-12"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>

        {/* Camera Capture Modal */}
        <CameraCapture
          open={cameraOpen}
          onOpenChange={(open) => {
            setCameraOpen(open);
            if (!open) setCameraOrderId(null);
          }}
          onCapture={handleVisualVerification}
          isProcessing={visualVerification.isPending}
        />
      </div>
    );
  }

  // Desktop Layout
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
            <div className="flex gap-1 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus("pending")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedStatus === "pending"
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
              >
                Pending {tabCounts.pending > 0 && `(${tabCounts.pending})`}
              </Button>
              <Button
                variant={selectedStatus === "ready_for_lockers" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("ready_for_lockers")}
                className={cn(
                  "h-8 px-3 text-xs font-medium",
                  selectedStatus === "ready_for_lockers" ? "text-white" : ""
                )}
                style={selectedStatus === "ready_for_lockers" ? {
                  backgroundColor: "#10b981", // emerald-500
                  borderColor: "#10b981"
                } : {
                  color: "#10b981",
                  borderColor: "#10b981",
                  backgroundColor: "transparent"
                }}
              >
                Ready {tabCounts.ready > 0 && `(${tabCounts.ready})`}
              </Button>
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
          {tabCounts.ready > 0 &&
            selectedStatus !== "ready_for_lockers" && (
              <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-between">
                <div className="text-sm text-yellow-800 font-medium">
                  {tabCounts.ready} order
                  {tabCounts.ready > 1 ? "s" : ""} ready for
                  lockers
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStatus("ready_for_lockers")}
                >
                  View
                </Button>
              </div>
            )}
          {/* Ready for Lockers batch bar */}
          {selectedStatus === "ready_for_lockers" && (
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
            const isSelected = selectedOrderId === order.id;

            return (
              <div
                key={order.id}
                onClick={() => onOrderSelect(order.id)}
                className={cn(
                  "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100",
                  isSelected && "bg-blue-50 border-blue-200",
                  isOrderFlagged(order) && "bg-red-50 border-l-4 border-l-red-500",
                  !isOrderFlagged(order) && getVerificationStyle(order.visual_verification_status)?.borderClass,
                  order.status === "completed" &&
                    "bg-green-50 border-green-100 opacity-75"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectedStatus === "ready_for_lockers" && (
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
                    {(() => {
                      const verificationStyle = getVerificationStyle(order.visual_verification_status);
                      if (verificationStyle) {
                        return (
                          <Badge variant="outline" className={cn("text-xs px-1 py-0", verificationStyle.badgeClass)}>
                            {verificationStyle.label}
                          </Badge>
                        );
                      }
                      // Solo mostrar Awaiting si no tiene verificación
                      if (order.status === "pending_weight") {
                        return (
                          <Badge variant="outline" className="text-xs px-1 py-0 text-gray-600 border-gray-300 bg-gray-50">
                            Awaiting
                          </Badge>
                        );
                      }
                      return null;
                    })()}
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

              </div>
            </div>

            {/* Main Content - Visual Verification */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Visual Verification Section */}
              {selectedOrder.status === "pending_weight" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-6">
                    <div className="max-w-2xl mx-auto">
                      <Card className="h-full flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Eye className="h-6 w-6" />
                            Visual Verification
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-6">
                          {(() => {
                            const visualStatus = selectedOrder.visual_verification_status as
                              | "pending"
                              | "verified"
                              | "missing_items"
                              | "extra_items"
                              | "uncertain"
                              | "wrong_image"
                              | null;
                            const visualResultData = selectedOrder.visual_verification_result as VisualVerificationResult | null;

                            if (visualStatus === "pending") {
                              return (
                                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                  <span className="text-blue-700">
                                    Processing visual verification...
                                  </span>
                                </div>
                              );
                            }

                            if (visualStatus && visualResultData) {
                              return (
                                <VisualVerificationResultCard
                                  result={visualResultData}
                                  status={visualStatus}
                                  processingTimeSeconds={getProcessingTimeSeconds(selectedOrder as Order)}
                                  onRetry={() => setCameraOpen(true)}
                                />
                              );
                            }

                            return (
                              <div className="text-center py-8">
                                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-4">
                                  Take a photo to verify the order
                                </p>
                                <Button
                                  onClick={() => setCameraOpen(true)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                >
                                  <Camera className="h-4 w-4 mr-2" />
                                  Open Camera
                                </Button>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Order already processed */}
              {selectedOrder.status !== "pending_weight" && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Order Verified
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {selectedOrder.status === "weighed"
                        ? "This order is ready for lockers"
                        : "This order has been completed"}
                    </p>
                    {/* Show verification result if available */}
                    {(() => {
                      const visualStatus = selectedOrder.visual_verification_status as
                        | "pending" | "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image" | null;
                      const visualResultData = selectedOrder.visual_verification_result as VisualVerificationResult | null;

                      if (visualStatus && visualStatus !== "pending" && visualResultData) {
                        return (
                          <div className="max-w-md mx-auto mt-4">
                            <VisualVerificationResultCard
                              result={visualResultData}
                              status={visualStatus}
                              processingTimeSeconds={getProcessingTimeSeconds(selectedOrder as Order)}
                              onRetry={() => setCameraOpen(true)}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select an order to verify
              </h3>
              <p className="text-gray-500">
                Choose an order from the list to start the verification process
              </p>
            </div>
          </div>
        )}
      </div>

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

      {/* Camera Capture Modal for Visual Verification */}
      <CameraCapture
        open={cameraOpen}
        orderId={cameraOrderId || selectedOrderId || undefined}
        onOpenChange={(open) => {
          setCameraOpen(open);
          if (!open) setCameraOrderId(null);
        }}
        onCapture={handleVisualVerification}
        isProcessing={visualVerification.isPending}
      />
    </div>
  );
}
