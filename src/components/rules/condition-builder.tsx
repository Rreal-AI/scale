"use client";

import { useState, useEffect } from "react";
import { RuleCondition } from "@/schemas/rules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";

interface ConditionBuilderProps {
  condition: RuleCondition;
  onChange: (condition: Partial<RuleCondition>) => void;
  disabled?: boolean;
}

export function ConditionBuilder({ condition, onChange, disabled = false }: ConditionBuilderProps) {
  const { data: categoriesData, error: categoriesError } = useCategories();
  const { data: productsData, error: productsError } = useProducts();
  
  const categories = categoriesData?.categories || [];
  const products = productsData?.products || [];

  // Handle error states
  if (categoriesError || productsError) {
    console.error("ConditionBuilder - Data errors:", { categoriesError, productsError });
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-sm text-red-600">Error loading data</p>
        <p className="text-xs text-red-500 mt-1">Please refresh the page and try again</p>
      </div>
    );
  }

  const updateCondition = (updates: Partial<RuleCondition>) => {
    const updated = { ...condition, ...updates };
    
    // Generate description based on current values
    let description = "";
    
    if (updated.type === "category_quantity") {
      const category = categories?.find(c => c.id === updated.category_id);
      const categoryName = category?.name || "selected category";
      
      if (updated.operator === "every") {
        description = `Every ${updated.value} items in '${categoryName}'`;
      } else if (updated.operator === "greater_than") {
        description = `More than ${updated.value} items in '${categoryName}'`;
      } else if (updated.operator === "equal_to") {
        description = `Exactly ${updated.value} items in '${categoryName}'`;
      } else if (updated.operator === "less_than") {
        description = `Less than ${updated.value} items in '${categoryName}'`;
      }
    } else if (updated.type === "total_items") {
      if (updated.operator === "every") {
        description = `Every ${updated.value} total items`;
      } else if (updated.operator === "greater_than") {
        description = `More than ${updated.value} total items`;
      } else if (updated.operator === "equal_to") {
        description = `Exactly ${updated.value} total items`;
      } else if (updated.operator === "less_than") {
        description = `Less than ${updated.value} total items`;
      }
    } else if (updated.type === "product_quantity") {
      const product = products?.find(p => p.id === updated.product_id);
      const productName = product?.name || "selected product";
      
      if (updated.operator === "every") {
        description = `Every ${updated.value} '${productName}'`;
      } else if (updated.operator === "greater_than") {
        description = `More than ${updated.value} '${productName}'`;
      } else if (updated.operator === "equal_to") {
        description = `Exactly ${updated.value} '${productName}'`;
      } else if (updated.operator === "less_than") {
        description = `Less than ${updated.value} '${productName}'`;
      }
    } else if (updated.type === "order_value") {
      if (updated.operator === "every") {
        description = `Every $${updated.value} order value`;
      } else if (updated.operator === "greater_than") {
        description = `Order value more than $${updated.value}`;
      } else if (updated.operator === "equal_to") {
        description = `Order value exactly $${updated.value}`;
      } else if (updated.operator === "less_than") {
        description = `Order value less than $${updated.value}`;
      }
    }

    onChange({ ...updates, description });
  };

  return (
    <div className="space-y-4">
      {/* Condition Type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Condition Type</Label>
        <Select
          value={condition.type}
          onValueChange={(value) => updateCondition({ 
            type: value as RuleCondition["type"],
            category_id: value !== "category_quantity" ? undefined : condition.category_id,
            product_id: value !== "product_quantity" ? undefined : condition.product_id,
          })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category_quantity">Category Quantity</SelectItem>
            <SelectItem value="total_items">Total Items</SelectItem>
            <SelectItem value="product_quantity">Specific Product Quantity</SelectItem>
            <SelectItem value="order_value">Order Value</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Selection (for category_quantity) */}
      {condition.type === "category_quantity" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Category</Label>
          <Select
            value={condition.category_id || ""}
            onValueChange={(value) => updateCondition({ category_id: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Product Selection (for product_quantity) */}
      {condition.type === "product_quantity" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Product</Label>
          <Select
            value={condition.product_id || ""}
            onValueChange={(value) => updateCondition({ product_id: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Operator and Value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Operator</Label>
          <Select
            value={condition.operator}
            onValueChange={(value) => updateCondition({ operator: value as RuleCondition["operator"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="every">Every</SelectItem>
              <SelectItem value="greater_than">Greater than</SelectItem>
              <SelectItem value="equal_to">Equal to</SelectItem>
              <SelectItem value="less_than">Less than</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {condition.type === "order_value" ? "Value ($)" : "Quantity"}
          </Label>
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition({ value: parseInt(e.target.value) || 0 })}
            disabled={disabled}
            className="h-8"
            min="1"
          />
        </div>
      </div>

      {/* Description Preview */}
      <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
        <strong>Preview:</strong> {condition.description}
      </div>
    </div>
  );
}