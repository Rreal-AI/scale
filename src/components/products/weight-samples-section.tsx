"use client";

import { useState } from "react";
import { Plus, Trash2, Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useWeightSamples,
  useWeightSampleStats,
  useCreateWeightSample,
  useDeleteWeightSample,
} from "@/hooks/use-product-weight-samples";
import { gramsToOunces, ouncesToGrams } from "@/lib/weight-conversion";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface WeightSamplesSectionProps {
  productId: string;
  productWeight: number; // in grams
}

interface SingleProductStatsResponse {
  product: {
    id: string;
    name: string;
    weight: number;
  } | null;
  stats: {
    product_id: string;
    sample_count: number;
    min_weight: number | null;
    max_weight: number | null;
    avg_weight: string | null;
  };
}

export function WeightSamplesSection({
  productId,
  productWeight,
}: WeightSamplesSectionProps) {
  const [newWeightOz, setNewWeightOz] = useState("");
  const [sampleToDelete, setSampleToDelete] = useState<string | null>(null);

  const { data: samplesData, isLoading: loadingSamples } = useWeightSamples({
    product_id: productId,
    is_single_product: true,
    limit: 100,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const { data: statsData, isLoading: loadingStats } = useWeightSampleStats(productId);
  const createSample = useCreateWeightSample();
  const deleteSample = useDeleteWeightSample();

  const stats = (statsData as SingleProductStatsResponse)?.stats;
  const samples = samplesData?.samples || [];

  const handleAddSample = async () => {
    const weightOz = parseFloat(newWeightOz);
    if (isNaN(weightOz) || weightOz <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    const weightGrams = ouncesToGrams(weightOz);

    try {
      await createSample.mutateAsync({
        product_id: productId,
        weight: weightGrams,
        item_count: 1,
        is_single_product: true,
      });
      setNewWeightOz("");
      toast.success("Weight sample added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add sample");
    }
  };

  const handleDeleteSample = async () => {
    if (!sampleToDelete) return;

    try {
      await deleteSample.mutateAsync(sampleToDelete);
      toast.success("Sample deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sample");
    } finally {
      setSampleToDelete(null);
    }
  };

  const configuredWeightOz = gramsToOunces(productWeight);
  const avgWeightGrams = stats?.avg_weight ? parseFloat(stats.avg_weight) : null;
  const avgWeightOz = avgWeightGrams ? gramsToOunces(avgWeightGrams) : null;
  const sampleCount = stats?.sample_count || 0;

  // Calculate deviation percentage
  const deviation = avgWeightGrams
    ? ((avgWeightGrams - productWeight) / productWeight) * 100
    : null;
  const isSignificantDeviation = deviation !== null && Math.abs(deviation) > 20;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Weight Samples</h4>
        {sampleCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {sampleCount} sample{sampleCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Stats summary */}
      {loadingStats ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stats...
        </div>
      ) : sampleCount > 0 ? (
        <div className="p-3 rounded-lg border bg-card/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Configured weight:</span>
            <Badge variant="outline">{configuredWeightOz} oz</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Average from samples:</span>
            <Badge
              variant={isSignificantDeviation ? "destructive" : "secondary"}
            >
              {avgWeightOz?.toFixed(2)} oz
            </Badge>
          </div>
          {deviation !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Deviation:</span>
              <span
                className={`text-sm font-medium ${
                  isSignificantDeviation
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {deviation > 0 ? "+" : ""}
                {deviation.toFixed(1)}%
              </span>
            </div>
          )}
          {stats?.min_weight && stats?.max_weight && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Range:</span>
              <span>
                {gramsToOunces(stats.min_weight).toFixed(2)} oz -{" "}
                {gramsToOunces(stats.max_weight).toFixed(2)} oz
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No weight samples yet. Add samples to track actual product weights.
        </p>
      )}

      {/* Add new sample */}
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Weight in oz"
          value={newWeightOz}
          onChange={(e) => setNewWeightOz(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSample();
            }
          }}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleAddSample}
          disabled={createSample.isPending || !newWeightOz}
        >
          {createSample.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="ml-1">Add</span>
        </Button>
      </div>

      {/* Samples list */}
      {loadingSamples ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : samples.length > 0 ? (
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {samples.map((sample) => (
              <div
                key={sample.id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {gramsToOunces(sample.weight).toFixed(2)} oz
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(sample.created_at)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setSampleToDelete(sample.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : null}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!sampleToDelete}
        onOpenChange={(open) => !open && setSampleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weight Sample</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this weight sample? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSample}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSample.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
