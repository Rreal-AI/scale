"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDeletePackaging } from "@/hooks/use-packaging";
import { formatWeight } from "@/lib/format";
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

interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface DeletePackagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packaging: Packaging | null;
}

export function DeletePackagingDialog({
  open,
  onOpenChange,
  packaging,
}: DeletePackagingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePackaging = useDeletePackaging();

  const handleDelete = async () => {
    if (!packaging) return;

    setIsDeleting(true);

    try {
      await deletePackaging.mutateAsync(packaging.id);
      toast.success("Packaging deleted successfully");
      onOpenChange(false);
    } catch {
      toast.error("Error deleting packaging");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
    }
  };

  const isLoading = isDeleting || deletePackaging.isPending;

  if (!packaging) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Packaging</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg border p-4 bg-muted/50">
          <div className="space-y-2">
            <div className="font-medium">{packaging.name}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{formatWeight(packaging.weight)}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {packaging.id}
            </div>
          </div>
        </div>

        <AlertDialogDescription>
          Are you sure you want to delete this packaging? This action will
          permanently remove the packaging from your catalog.
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Packaging
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
