"use client";

import {
  Tag,
  FileText,
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
import { useSingleCategory } from "@/hooks/use-categories";
import { formatDate, formatRelativeTime } from "@/lib/format";
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

interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export function CategoryDetailSheet({
  open,
  onOpenChange,
  categoryId,
  onEdit,
  onDelete,
}: CategoryDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    data: categoryData,
    isLoading,
    error,
  } = useSingleCategory(categoryId || "");

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

  const category = categoryData?.category;

  if (!open || !categoryId) return null;

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
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {copyable && copyValue && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(copyValue, title)}
                  >
                    {copiedField === title ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
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
        <div className="text-base font-semibold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading category details...</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !category) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">
                Error loading category
              </p>
              <p className="text-sm text-muted-foreground">
                {error?.message || "Category not found"}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-2xl">{category.name}</SheetTitle>
              <SheetDescription>
                Category details and information
              </SheetDescription>
            </div>
            <Badge variant="outline" className="ml-2">
              Category
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4">
              <InfoCard
                icon={Tag}
                title="Name"
                value={category.name}
                description="Category name"
              />
              <InfoCard
                icon={FileText}
                title="Description"
                value={
                  category.description ? (
                    <span className="text-sm">{category.description}</span>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      No description
                    </Badge>
                  )
                }
                description="Category description"
              />
            </div>
          </div>

          <Separator />

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">System Information</h3>
            <div className="grid gap-4">
              <InfoCard
                icon={Copy}
                title="Category ID"
                value={
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {category.id}
                  </code>
                }
                description="Unique identifier"
                copyable
                copyValue={category.id}
              />
              <InfoCard
                icon={Calendar}
                title="Created"
                value={formatDate(category.created_at)}
                description={`${formatRelativeTime(category.created_at)}`}
              />
              <InfoCard
                icon={Clock}
                title="Last Updated"
                value={formatDate(category.updated_at)}
                description={`${formatRelativeTime(category.updated_at)}`}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-6">
          <div className="flex w-full space-x-2">
            <Button
              variant="outline"
              onClick={() => onEdit?.(category)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete?.(category)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
