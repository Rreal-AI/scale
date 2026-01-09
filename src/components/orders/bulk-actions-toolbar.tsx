"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, X } from "lucide-react";
import { useBulkDeleteOrders } from "@/hooks/use-orders";
import { toast } from "sonner";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedOrderIds: string[];
  onDeselectAll: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedOrderIds,
  onDeselectAll,
}: BulkActionsToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bulkDeleteMutation = useBulkDeleteOrders();

  if (selectedCount === 0) {
    return null;
  }

  const handleDelete = async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync(selectedOrderIds);
      toast.success(`${result.deleted_count} order${result.deleted_count !== 1 ? "s" : ""} deleted successfully`);
      onDeselectAll();
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast.error("Failed to delete orders. Please try again.");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} order{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="h-4 w-px bg-gray-600" />

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedCount} order{selectedCount !== 1 ? "s" : ""}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                selected order{selectedCount !== 1 ? "s" : ""} and all
                associated items from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending
                  ? "Deleting..."
                  : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <X className="h-4 w-4 mr-2" />
          Deselect all
        </Button>
      </div>
    </div>
  );
}
