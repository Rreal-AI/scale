"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatePackaging, useUpdatePackaging } from "@/hooks/use-packaging";
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

  const createPackaging = useCreatePackaging();
  const updatePackaging = useUpdatePackaging();

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

  const onSubmit = async (
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
  );
}
