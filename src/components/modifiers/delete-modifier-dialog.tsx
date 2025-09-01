"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDeleteModifier } from "@/hooks/use-modifiers";
import { formatPrice, formatWeight } from "@/lib/format";
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
import { Badge } from "@/components/ui/badge";

interface Modifier {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface DeleteModifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifier: Modifier | null;
}

export function DeleteModifierDialog({
  open,
  onOpenChange,
  modifier,
}: DeleteModifierDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModifier = useDeleteModifier();

  const handleDelete = async () => {
    if (!modifier) return;

    setIsDeleting(true);

    try {
      await deleteModifier.mutateAsync(modifier.id);
      toast.success("Modifier deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Error deleting modifier");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  const isLoading = isDeleting || deleteModifier.isPending;

  if (!modifier) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Modifier</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg border p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="font-medium">{modifier.name}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{formatPrice(modifier.price)}</Badge>
              <Badge
                variant={modifier.weight < 0 ? "destructive" : "outline"}
                className={
                  modifier.weight < 0 ? "text-destructive-foreground" : ""
                }
              >
                {formatWeight(modifier.weight)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {modifier.id}
            </div>
          </div>
        </div>

        <AlertDialogDescription>
          Are you sure you want to delete this modifier? This action will
          permanently remove the modifier from your catalog.
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Modifier
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
