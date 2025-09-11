"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  Hash, 
  Weight, 
  Package, 
  Settings, 
  Copy,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRule } from "@/hooks/use-rules";

interface RuleDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId: string | null;
}

interface InfoCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  description?: string;
  copyable?: boolean;
  copyValue?: string;
}

function InfoCard({ icon: Icon, title, value, description, copyable, copyValue }: InfoCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyValue) return;
    
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        {copyable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function RuleDetailSheet({ open, onOpenChange, ruleId }: RuleDetailSheetProps) {
  const { data: rule, isLoading, error } = useRule(ruleId || "");

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Loading...</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !rule) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>
              Failed to load rule details
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {rule.is_active ? (
              <Play className="h-5 w-5 text-green-600" />
            ) : (
              <Pause className="h-5 w-5 text-muted-foreground" />
            )}
            {rule.name}
          </SheetTitle>
          <SheetDescription>
            {rule.description || "No description provided"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoCard
                icon={Settings}
                title="Status"
                value={
                  <Badge variant={rule.is_active ? "default" : "secondary"}>
                    {rule.is_active ? "Active" : "Inactive"}
                  </Badge>
                }
                description="Whether this rule is currently active"
              />

              <InfoCard
                icon={Hash}
                title="Priority"
                value={
                  <Badge variant="outline">
                    {rule.priority}
                  </Badge>
                }
                description="Lower numbers execute first"
              />
            </div>
          </div>

          <Separator />

          {/* Conditions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Conditions</h3>
            <div className="space-y-3">
              {rule.conditions.map((condition, index) => (
                <div key={condition.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {condition.type.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {condition.operator.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{condition.description}</div>
                  {condition.category_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Category ID: {condition.category_id}
                    </div>
                  )}
                  {condition.product_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Product ID: {condition.product_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Actions</h3>
            <div className="space-y-3">
              {rule.actions.map((action, index) => (
                <div key={action.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {action.type.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{action.description}</div>
                  {action.product_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Product ID: {action.product_id}
                    </div>
                  )}
                  {action.product_name && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Product: {action.product_name}
                    </div>
                  )}
                  {action.weight && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Weight: {action.weight}g ({(action.weight / 28.35).toFixed(1)} oz)
                    </div>
                  )}
                  {action.quantity && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Quantity: {action.quantity}
                    </div>
                  )}
                  {action.note && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Note: {action.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Metadata</h3>
            <div className="grid grid-cols-1 gap-4">
              <InfoCard
                icon={Calendar}
                title="Created"
                value={format(new Date(rule.created_at), "PPP 'at' p")}
                description="When this rule was created"
              />

              <InfoCard
                icon={Calendar}
                title="Last Updated"
                value={format(new Date(rule.updated_at), "PPP 'at' p")}
                description="When this rule was last modified"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}