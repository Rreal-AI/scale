"use client";

import { useState } from "react";
import { MessageSquare, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  notes: string | null;
}

interface EditableNotesProps {
  product: Product;
  onNotesUpdate: (productId: string, notes: string | null) => Promise<void>;
}

export function EditableNotes({ product, onNotesUpdate }: EditableNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(product.notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const hasNotes = !!product.notes && product.notes.trim().length > 0;

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setEditNotes(product.notes || "");
    }
  };

  const handleSave = async () => {
    const trimmedNotes = editNotes.trim();
    const newNotes = trimmedNotes.length > 0 ? trimmedNotes : null;

    // Don't save if nothing changed
    if (newNotes === product.notes) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onNotesUpdate(product.id, newNotes);
      toast.success("Notes updated");
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update notes"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditNotes(product.notes || "");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  hasNotes
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare
                  className={cn("h-4 w-4", hasNotes && "fill-current")}
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {hasNotes && !isOpen && (
            <TooltipContent side="top" className="max-w-[300px]">
              <p className="text-xs whitespace-pre-wrap">{product.notes}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Notes</span>
          </div>
          <Textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add observations or notes..."
            className="min-h-[100px] resize-none"
            maxLength={1000}
            disabled={isUpdating}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {editNotes.length}/1000
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
