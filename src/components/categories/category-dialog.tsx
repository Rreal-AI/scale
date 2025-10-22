

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import {
  createCategoryFormSchema,
  updateCategoryFormSchema,
  type CreateCategoryFormInput,
  type UpdateCategoryFormInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/schemas/categories";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  mode: "create" | "edit";
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  mode,
}: CategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const form = useForm<CreateCategoryFormInput | UpdateCategoryFormInput>({
    resolver: zodResolver(
      mode === "create" ? createCategoryFormSchema : updateCategoryFormSchema
    ),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && category) {
        form.reset({
          name: category.name,
          description: category.description || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
        });
      }
    }
  }, [open, mode, category, form]);

  const onSubmit = async (
    values: CreateCategoryFormInput | UpdateCategoryFormInput
  ) => {
    setIsSubmitting(true);

    try {
      // Process values (convert empty description to undefined)
      const processedValues = {
        ...values,
        description: values.description?.trim() || undefined,
      };

      if (mode === "create") {
        await createCategory.mutateAsync(
          processedValues as CreateCategoryInput
        );
        toast.success("Category created successfully");
      } else if (mode === "edit" && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          data: processedValues as UpdateCategoryInput,
        });
        toast.success("Category updated successfully");
      }

      form.reset();
      onOpenChange(false);
    } catch {
      toast.error(
        mode === "create"
          ? "Error creating category"
          : "Error updating category"
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
    isSubmitting || createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Complete the information to create a new category."
              : "Modify the category information."}
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
                      placeholder="e.g. Pizza"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for the category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Traditional and specialty pizzas with fresh ingredients"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of the category
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
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Category" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
