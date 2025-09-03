"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyzeOrderWeight, getWeightStatusConfig } from "@/lib/weight-analysis";
import { CheckCircle2, AlertTriangle, Search, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
}

interface WeightAnalysisResultProps {
  actualWeight: number;
  expectedWeight: number;
  orderItems: OrderItem[];
  tolerance?: number;
  onReWeigh?: () => void;
  onMarkReady?: () => void;
  onReviewOrder?: () => void;
  className?: string;
}

export function WeightAnalysisResult({
  actualWeight,
  expectedWeight,
  orderItems,
  tolerance = 4,
  onReWeigh,
  onMarkReady,
  onReviewOrder,
  className
}: WeightAnalysisResultProps) {
  const analysis = analyzeOrderWeight(actualWeight, expectedWeight, orderItems, tolerance);
  const config = getWeightStatusConfig(analysis.status);

  const getActionButton = () => {
    switch (analysis.action) {
      case 'ready':
        return onMarkReady && (
          <Button 
            onClick={onMarkReady}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Mark Ready for Delivery
          </Button>
        );
      case 're-weigh':
        return onReWeigh && (
          <Button 
            onClick={onReWeigh}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            size="lg"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Re-weigh Order
          </Button>
        );
      case 'review':
        return onReviewOrder && (
          <Button 
            onClick={onReviewOrder}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
            size="lg"
          >
            <Search className="h-5 w-5 mr-2" />
            Review Order
          </Button>
        );
    }
  };

  const getPriorityIndicator = () => {
    if (config.priority === 'high') {
      return (
        <div className="absolute -top-1 -right-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      );
    }
    return null;
  };

  return (
    <Card 
      className={cn(
        "relative transition-all duration-300",
        config.bgColor,
        config.borderColor,
        "border-2",
        className
      )}
    >
      {getPriorityIndicator()}
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h3 className={cn("text-lg font-semibold", config.color)}>
                  Weight Analysis
                </h3>
                <p className="text-sm text-gray-600">
                  {analysis.message}
                </p>
              </div>
            </div>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm font-medium",
                config.color,
                config.borderColor
              )}
            >
              {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
            </Badge>
          </div>

          {/* Weight Details */}
          <div className="grid grid-cols-3 gap-4 py-4 bg-white rounded-lg border border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Expected</div>
              <div className="text-xl font-bold text-gray-900">{expectedWeight} oz</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Actual</div>
              <div className="text-xl font-bold text-gray-900">{actualWeight} oz</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Difference</div>
              <div className={cn(
                "text-xl font-bold",
                analysis.delta > 0 ? "text-orange-600" : analysis.delta < 0 ? "text-amber-600" : "text-green-600"
              )}>
                {analysis.delta > 0 ? '+' : ''}{analysis.delta.toFixed(1)} oz
              </div>
            </div>
          </div>

          {/* Suggestion for underweight */}
          {analysis.status === 'underweight' && analysis.suggestedItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">
                    Possible Missing Item
                  </h4>
                  <p className="text-sm text-amber-700">
                    {analysis.suggestedItem}
                  </p>
                  {analysis.confidence && analysis.confidence < 70 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Low confidence - please verify manually
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            {getActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}