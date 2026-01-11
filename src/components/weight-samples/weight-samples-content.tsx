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
import { Loader2, Scale, ChevronDown, ChevronRight } from "lucide-react";
import { useWeightSampleStats, useWeightSamples } from "@/hooks/use-product-weight-samples";
import { gramsToOunces } from "@/lib/weight-conversion";
import { formatRelativeTime } from "@/lib/format";

interface WeightSampleStats {
  product_id: string;
  product_name: string | null;
  product_weight: number | null;
  sample_count: number;
  min_weight: number | null;
  max_weight: number | null;
  avg_weight: string | null;
}

export function WeightSamplesContent() {
  const { data: statsData, isLoading, error } = useWeightSampleStats();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Weight Samples</h1>
        <p className="text-muted-foreground">
          View weight calibration samples and statistics per product
        </p>
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
              {stats.reduce((sum, s) => sum + s.sample_count, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Samples per Product</CardDescription>
            <CardTitle className="text-3xl">
              {stats.length > 0
                ? (
                    stats.reduce((sum, s) => sum + s.sample_count, 0) /
                    stats.length
                  ).toFixed(1)
                : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Product Weight Statistics
          </CardTitle>
          <CardDescription>
            Statistics from weighing samples collected during order processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
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
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              How to collect weight samples
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>
                When weighing an order with only <strong>one product</strong>,
                you&apos;ll see a &quot;Save as Weight Sample&quot; button
              </li>
              <li>
                Click the button to save the actual weight as a calibration
                sample
              </li>
              <li>
                Collect multiple samples per product to get accurate statistics
              </li>
              <li>
                Compare the average sampled weight with the configured weight to
                identify discrepancies
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
