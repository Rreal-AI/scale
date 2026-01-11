"use client";

import { AlertTriangle } from "lucide-react";
import { gramsToOunces } from "@/lib/weight-conversion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface WeightDeviationIndicatorProps {
  productWeight: number; // in grams
  avgSampleWeight: number | null; // in grams
  sampleCount: number;
}

export function WeightDeviationIndicator({
  productWeight,
  avgSampleWeight,
  sampleCount,
}: WeightDeviationIndicatorProps) {
  // Don't show anything if no samples
  if (sampleCount === 0 || avgSampleWeight === null) {
    return null;
  }

  // Calculate deviation percentage
  const deviation = ((avgSampleWeight - productWeight) / productWeight) * 100;
  const isSignificant = Math.abs(deviation) > 20;

  // Only show indicator if deviation is significant (>20%)
  if (!isSignificant) {
    return null;
  }

  const configuredOz = gramsToOunces(productWeight);
  const avgOz = gramsToOunces(avgSampleWeight);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full cursor-help",
              deviation > 0
                ? "bg-orange-100 text-orange-600"
                : "bg-red-100 text-red-600"
            )}
          >
            <AlertTriangle className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <div className="space-y-1 text-xs">
            <p className="font-medium">
              Weight deviation: {deviation > 0 ? "+" : ""}
              {deviation.toFixed(1)}%
            </p>
            <p className="text-muted-foreground">
              Configured: {configuredOz} oz
            </p>
            <p className="text-muted-foreground">
              Avg from {sampleCount} sample{sampleCount !== 1 ? "s" : ""}:{" "}
              {avgOz.toFixed(2)} oz
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
