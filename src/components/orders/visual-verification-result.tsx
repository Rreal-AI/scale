"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Camera,
  X,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageViewer } from "@/components/ui/image-viewer";
import type { VisualVerificationResult } from "@/schemas/visual-verification";

interface VisualVerificationResultProps {
  result: VisualVerificationResult;
  status: "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image";
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const statusConfig = {
  verified: {
    icon: CheckCircle2,
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    title: "Order Verified",
    emoji: "check",
  },
  missing_items: {
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    title: "Missing Items Detected",
    emoji: "warning",
  },
  extra_items: {
    icon: AlertTriangle,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    title: "Extra Items Detected",
    emoji: "search",
  },
  uncertain: {
    icon: HelpCircle,
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    title: "Uncertain Verification",
    emoji: "question",
  },
  wrong_image: {
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    title: "Wrong Order Photo",
    emoji: "x",
  },
};

export function VisualVerificationResultCard({
  result,
  status,
  onRetry,
  onDismiss,
  className,
}: VisualVerificationResultProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleOpenImage = (index: number) => {
    setSelectedImageIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <ImageViewer
        images={result.images || []}
        initialIndex={selectedImageIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    <Card
      className={cn(
        "relative transition-all duration-300 border-2",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}

      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("h-8 w-8", config.color)} />
            <div className="flex-1">
              <h3 className={cn("text-lg font-semibold", config.color)}>
                {config.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Confidence: {result.confidence}%
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {result.identified_items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  item.found ? "bg-green-100" : "bg-red-100"
                )}
              >
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  {item.found ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-xs text-gray-500">
                    {item.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {result.missing_items.length > 0 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <h4 className="font-medium text-red-800 mb-1">
                Possibly Missing Items:
              </h4>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {result.missing_items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {result.extra_items.length > 0 && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
              <h4 className="font-medium text-orange-800 mb-1">
                Extra Items Detected:
              </h4>
              <ul className="text-sm text-orange-700 list-disc list-inside">
                {result.extra_items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {result.wrong_order && (
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                WRONG ORDER PHOTO
              </h4>
              <p className="text-sm text-red-700">
                The photo appears to be from a completely different order.
                The items visible do NOT match the expected order items.
              </p>
            </div>
          )}

          {result.notes && (
            <p className="text-sm text-gray-600 italic">{result.notes}</p>
          )}

          {/* Images thumbnails */}
          {result.images && result.images.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Verification photos ({result.images.length})
              </h4>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {result.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => handleOpenImage(index)}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <img
                      src={img}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Take Another Photo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
