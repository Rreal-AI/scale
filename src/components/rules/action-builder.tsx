"use client";

import { useState } from "react";
import { RuleAction } from "@/schemas/rules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/hooks/use-products";

interface ActionBuilderProps {
  action: RuleAction;
  onChange: (action: Partial<RuleAction>) => void;
  disabled?: boolean;
}

export function ActionBuilder({ action, onChange, disabled = false }: ActionBuilderProps) {
  const { data: productsData, error: productsError, isLoading: productsLoading } = useProducts();
  
  const products = productsData?.products || [];
  const [isCustomProduct, setIsCustomProduct] = useState(!action.product_id);

  // Handle error state
  if (productsError) {
    console.error("ActionBuilder - Products error:", productsError);
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-sm text-red-600">Error loading products: {productsError.message}</p>
        <p className="text-xs text-red-500 mt-1">You can still create custom products</p>
      </div>
    );
  }

  const updateAction = (updates: Partial<RuleAction>) => {
    const updated = { ...action, ...updates };
    
    // Generate description based on current values
    let description = "";
    
    if (updated.type === "add_product") {
      if (updated.product_id) {
        const product = products?.find(p => p.id === updated.product_id);
        const productName = product?.name || "selected product";
        const quantity = updated.quantity || 1;
        description = `Add ${quantity} '${productName}'`;
      } else if (updated.product_name) {
        const quantity = updated.quantity || 1;
        const weight = updated.weight ? ` (${(updated.weight / 28.35).toFixed(1)} oz)` : "";
        description = `Add ${quantity} '${updated.product_name}'${weight}`;
      } else {
        description = "Add product";
      }
    } else if (updated.type === "add_weight") {
      const weight = updated.weight || 0;
      const weightOz = (weight / 28.35).toFixed(1);
      description = `Add ${weightOz} oz weight`;
    } else if (updated.type === "add_note") {
      const note = updated.note || "";
      description = `Add note: ${note.substring(0, 30)}${note.length > 30 ? "..." : ""}`;
    }

    onChange({ ...updates, description });
  };

  const handleProductTypeChange = (isCustom: boolean) => {
    setIsCustomProduct(isCustom);
    if (isCustom) {
      updateAction({ product_id: undefined });
    } else {
      updateAction({ product_name: undefined, weight: undefined });
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Action Type</Label>
        <Select
          value={action.type}
          onValueChange={(value) => updateAction({ 
            type: value as RuleAction["type"],
            // Reset fields when changing type
            product_id: value !== "add_product" ? undefined : action.product_id,
            product_name: value !== "add_product" ? undefined : action.product_name,
            weight: value !== "add_weight" ? undefined : action.weight,
            note: value !== "add_note" ? undefined : action.note,
          })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add_product">Add Product</SelectItem>
            <SelectItem value="add_weight">Add Weight</SelectItem>
            <SelectItem value="add_note">Add Note</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Selection (for add_product) */}
      {action.type === "add_product" && (
        <>
          {/* Product Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Product Type</Label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleProductTypeChange(false)}
                disabled={disabled}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  !isCustomProduct 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                Existing Product
              </button>
              <button
                type="button"
                onClick={() => handleProductTypeChange(true)}
                disabled={disabled}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  isCustomProduct 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                Custom Product
              </button>
            </div>
          </div>

          {/* Existing Product Selection */}
          {!isCustomProduct && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Product</Label>
              <Select
                value={action.product_id || ""}
                onValueChange={(value) => updateAction({ product_id: value })}
                disabled={disabled}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.weight ? `${(product.weight / 28.35).toFixed(1)} oz` : "No weight"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Product Inputs */}
          {isCustomProduct && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Product Name</Label>
                <Input
                  value={action.product_name || ""}
                  onChange={(e) => updateAction({ product_name: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g., Trio de Salsas"
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Weight (ounces)</Label>
                <Input
                  type="number"
                  value={action.weight ? (action.weight / 28.35).toFixed(1) : ""}
                  onChange={(e) => {
                    const ounces = parseFloat(e.target.value) || 0;
                    const grams = Math.round(ounces * 28.35);
                    updateAction({ weight: grams });
                  }}
                  disabled={disabled}
                  placeholder="6"
                  className="h-8"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  {action.weight ? `${action.weight}g` : ""}
                </p>
              </div>
            </>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Quantity</Label>
            <Input
              type="number"
              value={action.quantity || 1}
              onChange={(e) => updateAction({ quantity: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              className="h-8"
              min="1"
            />
          </div>
        </>
      )}

      {/* Weight Input (for add_weight) */}
      {action.type === "add_weight" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Weight (ounces)</Label>
          <Input
            type="number"
            value={action.weight ? (action.weight / 28.35).toFixed(1) : ""}
            onChange={(e) => {
              const ounces = parseFloat(e.target.value) || 0;
              const grams = Math.round(ounces * 28.35);
              updateAction({ weight: grams });
            }}
            disabled={disabled}
            placeholder="6"
            className="h-8"
            min="0"
            step="0.1"
          />
          <p className="text-xs text-muted-foreground">
            {action.weight ? `${action.weight}g` : ""}
          </p>
        </div>
      )}

      {/* Note Input (for add_note) */}
      {action.type === "add_note" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Note</Label>
          <Textarea
            value={action.note || ""}
            onChange={(e) => updateAction({ note: e.target.value })}
            disabled={disabled}
            placeholder="e.g., Special instructions for this order"
            className="min-h-[60px]"
          />
        </div>
      )}

      {/* Description Preview */}
      <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
        <strong>Preview:</strong> {action.description}
      </div>
    </div>
  );
}