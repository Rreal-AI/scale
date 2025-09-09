"use client";

import {
  Package,
  DollarSign,
  Weight,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProduct } from "@/hooks/use-products";
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
  SheetFooter,
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

interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface ProductDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductDetailSheet({
  open,
  onOpenChange,
  productId,
  onEdit,
  onDelete,
}: ProductDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: productData, isLoading, error } = useProduct(productId || "");

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

  const product = productData?.product;

  if (!open || !productId) return null;

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
      <SheetContent className="min-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isLoading ? "Loading..." : product?.name || "Product Details"}
          </SheetTitle>
          <SheetDescription>
            {isLoading
              ? "Fetching product information..."
              : "Complete product information and actions"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid gap-6 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-muted-foreground">
                    Loading product...
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-destructive mb-2">Error loading product</p>
                  <p className="text-sm text-muted-foreground">
                    Please try again
                  </p>
                </div>
              </div>
            ) : product ? (
              <>
                {/* Product Name */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    ID: {product.id.slice(0, 8)}...
                  </Badge>
                </div>

                <Separator />

                {/* Product Details */}
                <div className="grid gap-4">
                  <InfoCard
                    icon={DollarSign}
                    title="Price"
                    value={
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {formatPrice(product.price)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({product.price} cents)
                        </span>
                      </div>
                    }
                    description="Product selling price"
                    copyable
                    copyValue={formatPrice(product.price)}
                  />

                  <InfoCard
                    icon={Weight}
                    title="Weight"
                    value={
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm">
                          {formatWeight(product.weight)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({product.weight} grams)
                        </span>
                      </div>
                    }
                    description="Product weight"
                    copyable
                    copyValue={formatWeight(product.weight)}
                  />

                  <InfoCard
                    icon={Package}
                    title="Category"
                    value={
                      product.category ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">
                            {product.category.name}
                          </Badge>
                          {product.category.description && (
                            <span className="text-xs text-muted-foreground">
                              {product.category.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-sm">
                          No category assigned
                        </Badge>
                      )
                    }
                    description="Product category"
                    copyable={!!product.category}
                    copyValue={product.category?.name}
                  />
                </div>

                <Separator />

                {/* Timestamps */}
                <div className="grid gap-4">
                  <InfoCard
                    icon={Calendar}
                    title="Created Date"
                    value={formatDate(product.created_at)}
                    description={formatRelativeTime(product.created_at)}
                  />

                  <InfoCard
                    icon={Clock}
                    title="Last Updated"
                    value={formatDate(product.updated_at)}
                    description={formatRelativeTime(product.updated_at)}
                  />
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
                        Product ID:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {product.id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => copyToClipboard(product.id, "ID")}
                        >
                          {copiedField === "ID" ? (
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
                        {product.org_id}
                      </code>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <SheetFooter className="flex-col gap-2">
          <Button
            onClick={() => product && onEdit?.(product)}
            className="w-full"
            disabled={isLoading || !product}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
          <Button
            variant="destructive"
            onClick={() => product && onDelete?.(product)}
            className="w-full"
            disabled={isLoading || !product}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Product
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
