"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateModifier, useUpdateModifier } from "@/hooks/use-modifiers";
import {
  createModifierSchema,
  updateModifierSchema,
  type CreateModifierInput,
  type UpdateModifierInput,
} from "@/schemas/modifiers";
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

interface Modifier {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  created_at: string;
  updated_at: string;
}

interface ModifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifier?: Modifier | null;
  mode: "create" | "edit";
}

export function ModifierDialog({
  open,
  onOpenChange,
  modifier,
  mode,
}: ModifierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createModifier = useCreateModifier();
  const updateModifier = useUpdateModifier();

  const form = useForm<CreateModifierInput | UpdateModifierInput>({
    resolver: zodResolver(
      mode === "create" ? createModifierSchema : updateModifierSchema
    ),
    defaultValues: {
      name: "",
      price: 0,
      weight: 0,
    },
  });

  // Reset form when dialog opens/closes or modifier changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && modifier) {
        form.reset({
          name: modifier.name,
          price: modifier.price / 100, // Convert cents to float
          weight: modifier.weight,
        });
      } else {
        form.reset({
          name: "",
          price: 0,
          weight: 0,
        });
      }
    }
  }, [open, mode, modifier, form]);

  const onSubmit = async (
    values: CreateModifierInput | UpdateModifierInput
  ) => {
    setIsSubmitting(true);

    try {
      // Convert price from float to cents
      const processedValues = {
        ...values,
        price: Math.round((values.price || 0) * 100), // Convert to cents
      };

      if (mode === "create") {
        await createModifier.mutateAsync(
          processedValues as CreateModifierInput
        );
        toast.success("Modifier created successfully");
      } else if (mode === "edit" && modifier) {
        await updateModifier.mutateAsync({
          id: modifier.id,
          data: processedValues as UpdateModifierInput,
        });
        toast.success("Modifier updated successfully");
      }

      form.reset();
      onOpenChange(false);
    } catch {
      toast.error(
        mode === "create"
          ? "Error creating modifier"
          : "Error updating modifier"
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
    isSubmitting || createModifier.isPending || updateModifier.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Modifier" : "Edit Modifier"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Complete the information to create a new modifier."
              : "Modify the modifier information."}
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
                      placeholder="e.g. Extra Cheese"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for the modifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <NumberInput
                      placeholder="1.50"
                      prefix="$"
                      decimalScale={2}
                      fixedDecimalScale={false}
                      thousandSeparator=","
                      value={field.value}
                      onValueChange={(value) => field.onChange(value || 0)}
                      min={0}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Modifier price (0 for no additional cost)
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
                      placeholder="25"
                      suffix=" g"
                      decimalScale={0}
                      thousandSeparator=","
                      value={field.value}
                      onValueChange={(value) => field.onChange(value || 0)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Weight change in grams (negative to remove weight)
                  </FormDescription>
                  <FormMessage />
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
                {mode === "create" ? "Create Modifier" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
