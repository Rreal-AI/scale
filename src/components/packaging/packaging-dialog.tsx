"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCreatePackaging, useUpdatePackaging, usePackaging } from "@/hooks/use-packaging";
import {
  createPackagingFormSchema,
  updatePackagingFormSchema,
  type CreatePackagingFormInput,
  type UpdatePackagingFormInput,
  type CreatePackagingInput,
  type UpdatePackagingInput,
} from "@/schemas/packaging";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Packaging {
  id: string;
  org_id: string;
  name: string;
  weight: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PackagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packaging?: Packaging | null;
  mode: "create" | "edit";
}

export function PackagingDialog({
  open,
  onOpenChange,
  packaging,
  mode,
}: PackagingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    currentDefault: Packaging | null;
    pendingValues: CreatePackagingFormInput | UpdatePackagingFormInput | null;
  }>({
    open: false,
    currentDefault: null,
    pendingValues: null,
  });

  const createPackaging = useCreatePackaging();
  const updatePackaging = useUpdatePackaging();

  // Fetch all packaging to find current default
  const { data: allPackagingData } = usePackaging({ limit: 100 });
  const allPackaging = allPackagingData?.packaging ?? [];

  const form = useForm<CreatePackagingFormInput | UpdatePackagingFormInput>({
    resolver: zodResolver(
      mode === "create" ? createPackagingFormSchema : updatePackagingFormSchema
    ),
    defaultValues: {
      name: "",
      weight: 0,
      is_default: false,
    },
  });

  // Reset form when dialog opens/closes or packaging changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && packaging) {
        form.reset({
          name: packaging.name,
          weight: packaging.weight,
          is_default: packaging.is_default,
        });
      } else {
        form.reset({
          name: "",
          weight: 0,
          is_default: false,
        });
      }
    }
  }, [open, mode, packaging, form]);

  const performSubmit = async (
    values: CreatePackagingFormInput | UpdatePackagingFormInput
  ) => {
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createPackaging.mutateAsync(values as CreatePackagingInput);
        toast.success("Packaging created successfully");
      } else if (mode === "edit" && packaging) {
        await updatePackaging.mutateAsync({
          id: packaging.id,
          data: values as UpdatePackagingInput,
        });
        toast.success("Packaging updated successfully");
      }

      form.reset();
      onOpenChange(false);
    } catch {
      toast.error(
        mode === "create"
          ? "Error creating packaging"
          : "Error updating packaging"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (
    values: CreatePackagingFormInput | UpdatePackagingFormInput
  ) => {
    // Check if trying to set as default
    const isSettingAsDefault = values.is_default === true;
    const wasAlreadyDefault = mode === "edit" && packaging?.is_default === true;

    if (isSettingAsDefault && !wasAlreadyDefault) {
      // Find current default (excluding this one if editing)
      const currentDefault = allPackaging.find(
        (p) => p.is_default && p.id !== packaging?.id
      );

      if (currentDefault) {
        // Show confirmation dialog
        setConfirmDialog({
          open: true,
          currentDefault,
          pendingValues: values,
        });
        return; // Don't submit yet
      }
    }

    // No conflict, proceed with submission
    await performSubmit(values);
  };

  const handleConfirmDefault = async () => {
    if (confirmDialog.pendingValues) {
      await performSubmit(confirmDialog.pendingValues);
    }
    setConfirmDialog({ open: false, currentDefault: null, pendingValues: null });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  const isLoading =
    isSubmitting || createPackaging.isPending || updatePackaging.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Packaging" : "Edit Packaging"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Complete the information to create a new packaging."
              : "Modify the packaging information."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Small Box"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for the packaging
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (grams)</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="50"
                      suffix=" g"
                      decimalScale={0}
                      thousandSeparator=","
                      value={field.value}
                      onValueChange={(value) => field.onChange(value || 0)}
                      min={0}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>Packaging weight in grams</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set as default</FormLabel>
                    <FormDescription>
                      This packaging will be pre-selected when weighing orders
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="outline" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Packaging" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Confirmation dialog when changing default */}
    <AlertDialog
      open={confirmDialog.open}
      onOpenChange={(open) =>
        !open && setConfirmDialog((prev) => ({ ...prev, open: false }))
      }
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <AlertDialogTitle>Change Default Packaging</AlertDialogTitle>
              <AlertDialogDescription>
                This will update your default packaging selection
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg border p-4 bg-muted/50">
          <p className="text-sm">
            <strong>{confirmDialog.currentDefault?.name}</strong> is currently
            the default.
          </p>
        </div>

        <AlertDialogDescription>
          Setting <strong>{form.getValues("name")}</strong> as default will
          remove <strong>{confirmDialog.currentDefault?.name}</strong> as the
          default.
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDefault}
            disabled={isLoading}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
