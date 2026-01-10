"use client";

import {
  Package,
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
import { useSinglePackaging } from "@/hooks/use-packaging";
import { formatWeight, formatDate, formatRelativeTime } from "@/lib/format";
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

interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PackagingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packagingId: string | null;
  onEdit?: (packaging: Packaging) => void;
  onDelete?: (packaging: Packaging) => void;
}

export function PackagingDetailSheet({
  open,
  onOpenChange,
  packagingId,
  onEdit,
  onDelete,
}: PackagingDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    data: packagingData,
    isLoading,
    error,
  } = useSinglePackaging(packagingId || "");

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

  const packaging = packagingData?.packaging;

  if (!open || !packagingId) return null;

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
              <span>Loading packaging details...</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !packaging) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">
                Error loading packaging
              </p>
              <p className="text-sm text-muted-foreground">
                {error?.message || "Packaging not found"}
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
              <SheetTitle className="text-2xl">{packaging.name}</SheetTitle>
              <SheetDescription>
                Packaging details and specifications
              </SheetDescription>
            </div>
            <Badge variant="outline" className="ml-2">
              Packaging
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={Package}
                title="Name"
                value={packaging.name}
                description="Packaging name"
              />
              <InfoCard
                icon={Weight}
                title="Weight"
                value={
                  <Badge variant="outline">
                    {formatWeight(packaging.weight)}
                  </Badge>
                }
                description="Packaging weight in grams"
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
                title="Packaging ID"
                value={
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {packaging.id}
                  </code>
                }
                description="Unique identifier"
                copyable
                copyValue={packaging.id}
              />
              <InfoCard
                icon={Calendar}
                title="Created"
                value={formatDate(packaging.created_at)}
                description={`${formatRelativeTime(packaging.created_at)}`}
              />
              <InfoCard
                icon={Clock}
                title="Last Updated"
                value={formatDate(packaging.updated_at)}
                description={`${formatRelativeTime(packaging.updated_at)}`}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t pt-6">
          <div className="flex w-full space-x-2">
            <Button
              variant="outline"
              onClick={() => onEdit?.(packaging)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete?.(packaging)}
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
