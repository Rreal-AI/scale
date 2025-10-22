"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import {
  createProductFormSchema,
  updateProductFormSchema,
  type CreateProductFormInput,
  type UpdateProductFormInput,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/schemas/products";
// NumberInput handles parsing automatically
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  org_id: string;
  name: string;
  price: number;
  weight: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  mode: "create" | "edit";
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  mode,
}: ProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    limit: 100, // Get all categories for selection
  });

  const form = useForm<CreateProductFormInput | UpdateProductFormInput>({
    resolver: zodResolver(
      mode === "create" ? createProductFormSchema : updateProductFormSchema
    ),
    defaultValues: {
      name: "",
      price: 0,
      weight: 0,
      category_id: undefined,
    },
  });

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && product) {
        form.reset({
          name: product.name,
          price: product.price / 100, // Convert cents to float
          weight: product.weight,
          category_id: product.category_id || undefined,
        });
      } else {
        form.reset({
          name: "",
          price: 0,
          weight: 0,
          category_id: undefined,
        });
      }
    }
  }, [open, mode, product, form]);

  const onSubmit = async (
    values: CreateProductFormInput | UpdateProductFormInput
  ) => {
    setIsSubmitting(true);

    try {
      // Convert price from float to cents
      const processedValues = {
        ...values,
        price: Math.round((values.price || 0) * 100), // Convert to cents
      };

      if (mode === "create") {
        await createProduct.mutateAsync(processedValues as CreateProductInput);
        toast.success("Product created successfully");
      } else if (mode === "edit" && product) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: processedValues as UpdateProductInput,
        });
        toast.success("Product updated successfully");
      }

      form.reset();
      onOpenChange(false);
    } catch {
      toast.error(
        mode === "create" ? "Error creating product" : "Error updating product"
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
    isSubmitting || createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Product" : "Edit Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Complete the information to create a new product."
              : "Modify the product information."}
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
                      placeholder="e.g. Margherita Pizza"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Descriptive name for the product
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
                      placeholder="12.50"
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
                    Product price (supports both 12.50 and 12,50)
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
                      placeholder="350"
                      suffix=" g"
                      decimalScale={0}
                      thousandSeparator=","
                      value={field.value}
                      onValueChange={(value) => field.onChange(value || 0)}
                      min={0}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>Product weight in grams</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      // Convert "__none__" back to undefined
                      field.onChange(value === "__none__" ? undefined : value);
                    }}
                    value={field.value || "__none__"}
                    disabled={isLoading || categoriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No category</SelectItem>
                      {categoriesData?.categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optional category to organize your products
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
                {mode === "create" ? "Create Product" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
