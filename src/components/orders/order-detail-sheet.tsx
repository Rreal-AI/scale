"use client";

import {
  FileText,
  User,
  MapPin,
  Phone,
  Mail,
  Weight,
  Calendar,
  Clock,
  Package,
  Settings,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOrder } from "@/hooks/use-orders";
import {
  formatPrice,
  formatWeight,
  formatDate,
  formatRelativeTime,
} from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OrderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

const statusLabels = {
  pending_weight: "Pending Weight",
  weighed: "Weighed",
  completed: "Dispatched",
  cancelled: "Cancelled",
  archived: "Archived",
};

const statusColors = {
  pending_weight: "default" as const,
  weighed: "secondary" as const,
  completed: "outline" as const,
  cancelled: "destructive" as const,
  archived: "outline" as const,
};

const typeLabels = {
  delivery: "Delivery",
  takeout: "Takeout",
};

export function OrderDetailSheet({
  open,
  onOpenChange,
  orderId,
}: OrderDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // openItems state removed - collapsible items not implemented yet

  const { data: orderData, isLoading, error } = useOrder(orderId || "");

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Error copying");
    }
  };

  // toggleItem function removed - collapsible items not implemented yet

  const order = orderData?.order;

  if (!open || !orderId) return null;

  const InfoCard = ({
    icon: Icon,
    title,
    value,
    description,
    copyable = false,
    copyValue,
  }: {
    icon: React.ElementType;
    title: string;
    value: string | React.ReactNode;
    description?: string;
    copyable?: boolean;
    copyValue?: string;
  }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium leading-none">{title}</p>
          {copyable && copyValue && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(copyValue, title)}
                  >
                    {copiedField === title ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy {title.toLowerCase()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-sm text-muted-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isLoading
              ? "Loading..."
              : order
              ? `Order #${order.check_number}`
              : "Order Details"}
          </SheetTitle>
          <SheetDescription>
            {isLoading
              ? "Fetching order information..."
              : "Complete order information with items and modifiers"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid gap-6 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-muted-foreground">
                    Loading order...
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-destructive mb-2">Error loading order</p>
                  <p className="text-sm text-muted-foreground">
                    Please try again
                  </p>
                </div>
              </div>
            ) : order ? (
              <>
                {/* Order Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Order #{order.check_number}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge variant="outline">{typeLabels[order.type]}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatPrice(order.total_amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total amount
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Customer Information */}
                <div className="grid gap-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Customer Information
                  </h4>

                  <InfoCard
                    icon={User}
                    title="Customer Name"
                    value={order.customer_name}
                    copyable
                    copyValue={order.customer_name}
                  />

                  {order.customer_email && (
                    <InfoCard
                      icon={Mail}
                      title="Email"
                      value={order.customer_email}
                      copyable
                      copyValue={order.customer_email}
                    />
                  )}

                  {order.customer_phone && (
                    <InfoCard
                      icon={Phone}
                      title="Phone"
                      value={order.customer_phone}
                      copyable
                      copyValue={order.customer_phone}
                    />
                  )}

                  {order.customer_address && (
                    <InfoCard
                      icon={MapPin}
                      title="Address"
                      value={order.customer_address}
                      copyable
                      copyValue={order.customer_address}
                    />
                  )}
                </div>

                <Separator />

                {/* Order Financial Details */}
                <div className="grid gap-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Financial Breakdown
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg border bg-card/50">
                      <div className="text-sm text-muted-foreground">
                        Subtotal
                      </div>
                      <div className="font-medium">
                        {formatPrice(order.subtotal_amount)}
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg border bg-card/50">
                      <div className="text-sm text-muted-foreground">Tax</div>
                      <div className="font-medium">
                        {formatPrice(order.tax_amount)}
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg border bg-primary/10">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="font-bold text-lg">
                        {formatPrice(order.total_amount)}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Weight Breakdown */}
                <div className="grid gap-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Weight Breakdown
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg border bg-card/50">
                      <div className="text-sm text-muted-foreground mb-1">
                        Expected Weight
                      </div>
                      <div className="font-medium text-lg">
                        {order.expected_weight
                          ? formatWeight(order.expected_weight)
                          : "—"}
                      </div>
                      {order.expected_weight && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Based on products
                        </div>
                      )}
                    </div>

                    <div className="text-center p-4 rounded-lg border bg-card/50">
                      <div className="text-sm text-muted-foreground mb-1">
                        Actual Weight
                      </div>
                      <div className="font-medium text-lg">
                        {order.actual_weight
                          ? formatWeight(order.actual_weight)
                          : "—"}
                      </div>
                      {order.weight_verified_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Verified{" "}
                          {formatRelativeTime(order.weight_verified_at)}
                        </div>
                      )}
                    </div>

                    <div
                      className={`text-center p-4 rounded-lg border ${
                        order.delta_weight !== null &&
                        order.delta_weight !== undefined
                          ? order.delta_weight === 0
                            ? "bg-green-50 border-green-200"
                            : Math.abs(order.delta_weight) > 50
                            ? "bg-destructive/10 border-destructive/20"
                            : "bg-yellow-50 border-yellow-200"
                          : "bg-card/50"
                      }`}
                    >
                      <div className="text-sm text-muted-foreground mb-1">
                        Weight Delta
                      </div>
                      <div
                        className={`font-bold text-lg ${
                          order.delta_weight !== null &&
                          order.delta_weight !== undefined
                            ? order.delta_weight === 0
                              ? "text-green-600"
                              : Math.abs(order.delta_weight) > 50
                              ? "text-destructive"
                              : "text-yellow-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {order.delta_weight !== null &&
                        order.delta_weight !== undefined
                          ? `${order.delta_weight > 0 ? "+" : ""}${formatWeight(
                              order.delta_weight
                            )}`
                          : "—"}
                      </div>
                      {order.delta_weight !== null &&
                        order.delta_weight !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {order.delta_weight === 0
                              ? "Perfect match"
                              : Math.abs(order.delta_weight) > 50
                              ? "Significant difference"
                              : "Minor difference"}
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Order Items ({order.items?.length || 0})
                  </h4>

                  {order.items?.map((item) => (
                    <Collapsible key={item.id}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-4 h-auto"
                          // onClick={() => toggleItem(item.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4" />
                            <div className="text-left">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Qty: {item.quantity} •{" "}
                                {formatPrice(item.total_price)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.modifiers?.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {item.modifiers.length} modifiers
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="space-y-3 ml-7">
                          {/* Product Info */}
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <div className="text-sm font-medium mb-2">
                              Product Details
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Name:
                                </span>{" "}
                                {item.product.name}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Price:
                                </span>{" "}
                                {formatPrice(item.product.price)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Weight:
                                </span>{" "}
                                {formatWeight(item.product.weight)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Quantity:
                                </span>{" "}
                                {item.quantity}
                              </div>
                            </div>
                          </div>

                          {/* Modifiers */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                Modifiers
                              </div>
                              {item.modifiers.map((itemModifier) => (
                                <div
                                  key={itemModifier.id}
                                  className="flex items-center justify-between p-2 rounded border bg-card/30"
                                >
                                  <div className="flex items-center gap-2">
                                    <Settings className="h-3 w-3" />
                                    <span className="text-sm">
                                      {itemModifier.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary">
                                      {formatPrice(itemModifier.total_price)}
                                    </Badge>
                                    <Badge
                                      variant={
                                        itemModifier.modifier.weight < 0
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className={
                                        itemModifier.modifier.weight < 0
                                          ? "text-destructive-foreground"
                                          : ""
                                      }
                                    >
                                      {formatWeight(
                                        itemModifier.modifier.weight
                                      )}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>

                <Separator />

                {/* Timestamps */}
                <div className="grid gap-4">
                  <InfoCard
                    icon={Calendar}
                    title="Created Date"
                    value={formatDate(order.created_at)}
                    description={formatRelativeTime(order.created_at)}
                  />

                  <InfoCard
                    icon={Clock}
                    title="Last Updated"
                    value={formatDate(order.updated_at)}
                    description={formatRelativeTime(order.updated_at)}
                  />

                  {order.weight_verified_at && (
                    <InfoCard
                      icon={Weight}
                      title="Weight Verified"
                      value={formatDate(order.weight_verified_at)}
                      description={formatRelativeTime(order.weight_verified_at)}
                    />
                  )}
                </div>

                <Separator />

                {/* Technical Details */}
                <div className="grid gap-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Technical Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <span className="text-sm text-muted-foreground">
                        Order ID:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {order.id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => copyToClipboard(order.id, "Order ID")}
                        >
                          {copiedField === "Order ID" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                      <span className="text-sm text-muted-foreground">
                        Organization:
                      </span>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                        {order.org_id}
                      </code>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
