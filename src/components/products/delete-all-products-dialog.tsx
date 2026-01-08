"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteAllProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAllProductsDialog({
  open,
  onOpenChange,
}: DeleteAllProductsDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const queryClient = useQueryClient();

  const isConfirmed = confirmText.toLowerCase() === "eliminar";

  // Fetch product count when dialog opens
  useEffect(() => {
    if (open) {
      setConfirmText("");
      setIsLoadingCount(true);
      
      fetch("/api/products/delete-all")
        .then(res => res.json())
        .then(data => {
          setProductCount(data.count);
        })
        .catch(err => {
          console.error("Error fetching product count:", err);
          setProductCount(null);
        })
        .finally(() => {
          setIsLoadingCount(false);
        });
    }
  }, [open]);

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch("/api/products/delete-all", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete products");
      }

      const result = await response.json();
      toast.success(`Se eliminaron ${result.deleted_count} productos exitosamente`);
      
      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting all products:", error);
      toast.error("Error al eliminar los productos");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setConfirmText("");
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Eliminar Todos los Productos</DialogTitle>
              <DialogDescription className="mt-1">
                Esta acción es irreversible
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">
                  {isLoadingCount ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    `Se eliminarán ${productCount ?? 0} productos`
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Todos los productos de tu organización serán eliminados permanentemente.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm font-medium">
              Para confirmar, escribe <span className="font-bold text-destructive">&quot;Eliminar&quot;</span> a continuación:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Escribe "Eliminar"'
              disabled={isDeleting}
              className={isConfirmed ? "border-green-500 focus-visible:ring-green-500/50" : ""}
              autoComplete="off"
            />
            {confirmText && !isConfirmed && (
              <p className="text-xs text-muted-foreground">
                Escribe exactamente &quot;Eliminar&quot; para continuar
              </p>
            )}
            {isConfirmed && (
              <p className="text-xs text-green-600">
                ✓ Confirmación válida
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting || productCount === 0}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Todo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

