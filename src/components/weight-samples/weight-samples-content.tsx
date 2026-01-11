"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Scale, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useWeightSampleStats, useWeightSamples } from "@/hooks/use-product-weight-samples";
import { gramsToOunces } from "@/lib/weight-conversion";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

interface WeightSampleStats {
  product_id: string;
  product_name: string | null;
  product_weight: number | null;
  sample_count: number;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: string | null;
}

type FilterType = "all" | "single" | "multi";

export function WeightSamplesContent() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Convert filter to API parameter
  const isSingleProductParam = filterType === "all" ? undefined : filterType === "single";

  const { data: statsData, isLoading: statsLoading } = useWeightSampleStats();
  const { data: allSamplesData, isLoading: samplesLoading, error } = useWeightSamples({
    is_single_product: isSingleProductParam,
    limit: 100,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const isLoading = statsLoading || samplesLoading;

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType === "single") params.set("is_single_product", "true");
      if (filterType === "multi") params.set("is_single_product", "false");

      const response = await fetch(`/api/product-weight-samples/export?${params}`);

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weight-samples-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("CSV exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Weight Samples</h1>
          <p className="text-muted-foreground">
            View weight calibration samples and statistics
          </p>
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
          <h1 className="text-2xl font-bold">Weight Samples</h1>
          <p className="text-muted-foreground">
            View weight calibration samples and statistics
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Error loading samples: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = (statsData as { stats: WeightSampleStats[] })?.stats || [];
  const allSamples = allSamplesData?.samples || [];

  // Count samples by type
  const singleProductCount = allSamples.filter(s => s.is_single_product).length;
  const multiProductCount = allSamples.filter(s => !s.is_single_product).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weight Samples</h1>
          <p className="text-muted-foreground">
            View weight calibration samples and statistics
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          onClick={() => setFilterType("all")}
        >
          All Orders ({allSamples.length})
        </Button>
        <Button
          variant={filterType === "single" ? "default" : "outline"}
          onClick={() => setFilterType("single")}
        >
          Single Product ({singleProductCount})
        </Button>
        <Button
          variant={filterType === "multi" ? "default" : "outline"}
          onClick={() => setFilterType("multi")}
        >
          Multiple Products ({multiProductCount})
        </Button>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products Sampled</CardDescription>
            <CardTitle className="text-3xl">{stats.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Samples</CardDescription>
            <CardTitle className="text-3xl">
              {allSamples.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Multi-Product Samples</CardDescription>
            <CardTitle className="text-3xl">{multiProductCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* All Samples Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weight Samples
          </CardTitle>
          <CardDescription>
            All recorded weight samples from order processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allSamples.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Scale className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No weight samples yet</p>
              <p className="text-sm">
                Weight samples will appear here when you save them during order
                weighing
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check #</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-center">Count</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Weight (oz)</TableHead>
                  <TableHead className="text-right">Weight (g)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(sample.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sample.check_number || "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={sample.items_summary || sample.product?.name || "-"}>
                      {sample.is_single_product
                        ? sample.product?.name || "Unknown Product"
                        : sample.items_summary || "Multiple Items"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{sample.item_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {sample.is_single_product ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Single
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Multi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {gramsToOunces(sample.weight).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {sample.weight}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats Table - Only for single product samples */}
      {filterType !== "multi" && stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Single Product Statistics
            </CardTitle>
            <CardDescription>
              Statistics aggregated by product (only for single-product samples)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead className="text-right">Configured</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => {
                  const avgWeight = stat.avg_weight
                    ? parseFloat(stat.avg_weight)
                    : null;
                  const configuredWeight = stat.product_weight || 0;
                  const avgOz = avgWeight ? gramsToOunces(avgWeight) : null;
                  const configuredOz = gramsToOunces(configuredWeight);
                  const minOz = stat.min_weight
                    ? gramsToOunces(stat.min_weight)
                    : null;
                  const maxOz = stat.max_weight
                    ? gramsToOunces(stat.max_weight)
                    : null;
                  const difference = avgOz ? avgOz - configuredOz : null;
                  const isExpanded = expandedProduct === stat.product_id;

                  return (
                    <>
                      <TableRow
                        key={stat.product_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedProduct(
                            isExpanded ? null : stat.product_id
                          )
                        }
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {stat.product_name || "Unknown Product"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{stat.sample_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {configuredOz.toFixed(2)} oz
                        </TableCell>
                        <TableCell className="text-right">
                          {minOz ? `${minOz.toFixed(2)} oz` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {avgOz ? `${avgOz.toFixed(2)} oz` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {maxOz ? `${maxOz.toFixed(2)} oz` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {difference !== null ? (
                            <Badge
                              variant={
                                Math.abs(difference) < 0.5
                                  ? "outline"
                                  : difference > 0
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {difference > 0 ? "+" : ""}
                              {difference.toFixed(2)} oz
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <ProductSamplesDetail
                              productId={stat.product_id}
                              productName={stat.product_name}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              How to collect weight samples
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>
                When weighing any order, you&apos;ll see a &quot;Save as Weight Sample&quot; button
              </li>
              <li>
                Click the button to save the actual weight as a calibration sample
              </li>
              <li>
                <strong>Single product</strong> samples help calibrate individual product weights
              </li>
              <li>
                <strong>Multi-product</strong> samples help analyze order patterns and packaging estimates
              </li>
              <li>
                Use the filters above to view samples by type and export to CSV for further analysis
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductSamplesDetail({
  productId,
  productName,
}: {
  productId: string;
  productName: string | null;
}) {
  const { data, isLoading } = useWeightSamples({
    product_id: productId,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const samples = data?.samples || [];

  return (
    <div className="p-4">
      <h4 className="font-medium mb-3">
        Recent samples for {productName || "Unknown Product"}
      </h4>
      {samples.length === 0 ? (
        <p className="text-sm text-muted-foreground">No samples recorded</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-4">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="flex items-center justify-between p-2 bg-background rounded border"
            >
              <span className="font-mono text-sm">
                {gramsToOunces(sample.weight).toFixed(2)} oz
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(sample.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
