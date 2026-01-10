"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Scale, Save } from "lucide-react";
import { toast } from "sonner";
import { useOrganization, useUpdateOrganization } from "@/hooks/use-organization";
import { NumberInput } from "@/components/ui/number-input";
import { gramsToOunces } from "@/lib/weight-conversion";

export function WeightSettingsContent() {
  const { data: orgData, isLoading, error } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [tolerance, setTolerance] = useState<number>(100);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize tolerance from org data
  useEffect(() => {
    if (orgData?.order_weight_delta_tolerance) {
      setTolerance(orgData.order_weight_delta_tolerance);
      setHasChanges(false);
    }
  }, [orgData?.order_weight_delta_tolerance]);

  const handleToleranceChange = (value: number | undefined) => {
    const newValue = value || 0;
    setTolerance(newValue);
    setHasChanges(newValue !== orgData?.order_weight_delta_tolerance);
  };

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({ order_weight_delta_tolerance: tolerance });
      toast.success("Weight settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Weight Settings</h1>
          <p className="text-muted-foreground">Configure weight tolerance thresholds</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Weight Settings</h1>
          <p className="text-muted-foreground">Configure weight tolerance thresholds</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Error loading settings: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const toleranceOz = gramsToOunces(tolerance);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Weight Settings</h1>
        <p className="text-muted-foreground">Configure weight tolerance thresholds</p>
      </div>

      {/* Weight Tolerance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weight Tolerance
          </CardTitle>
          <CardDescription>
            Set the acceptable weight difference between expected and actual weight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tolerance (grams)</label>
            <div className="flex items-center gap-4">
              <div className="w-48">
                <NumberInput
                  value={tolerance}
                  onValueChange={handleToleranceChange}
                  suffix=" g"
                  decimalScale={0}
                  min={0}
                  max={1000}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                = {toleranceOz.toFixed(2)} oz
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Orders within this tolerance will be marked as &quot;Perfect Weight&quot;
            </p>
          </div>

          {/* Explanation */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              How it works
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>
                <strong>Perfect Weight:</strong> Difference is within {tolerance}g ({toleranceOz.toFixed(1)} oz)
              </li>
              <li>
                <strong>Underweight:</strong> Actual weight is more than {tolerance}g below expected (possible missing items)
              </li>
              <li>
                <strong>Overweight:</strong> Actual weight is more than {tolerance}g above expected (review needed)
              </li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateOrg.isPending}
            >
              {updateOrg.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
