"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  X,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Reset state when dialog opens or index changes
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Reset zoom/rotation when changing images
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleRotateLeft = useCallback(() => {
    setRotation((r) => r - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((r) => r + 90);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const newScale = Math.max(s - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
  }, [images.length]);

  // Touch handlers for pinch-to-zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start (only when zoomed)
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance / lastTouchDistance.current;
      setScale((s) => Math.min(Math.max(s * delta, 1), 5));
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && dragStart.current) {
      // Pan
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale((s) => {
      const newScale = Math.min(Math.max(s + delta, 1), 5);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  // Swipe navigation (when not zoomed)
  const swipeStart = useRef<number | null>(null);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (scale === 1 && e.touches.length === 1) {
      swipeStart.current = e.touches[0].clientX;
    }
  }, [scale]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStart.current !== null && scale === 1) {
      const diff = swipeStart.current - e.changedTouches[0].clientX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    swipeStart.current = null;
  }, [scale, handleNext, handlePrev]);

  // Combined touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    handleTouchStart(e);
    handleSwipeStart(e);
  }, [handleTouchStart, handleSwipeStart]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    handleTouchEnd();
    handleSwipeEnd(e);
  }, [handleTouchEnd, handleSwipeEnd]);

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full w-full h-full max-h-full p-0 bg-black border-none rounded-none [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header with controls */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="text-white font-medium">
            {images.length > 1 && `${currentIndex + 1} / ${images.length}`}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="text-white hover:bg-white/20 disabled:opacity-50"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className="text-white hover:bg-white/20 disabled:opacity-50"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            <div className="w-px h-6 bg-white/30 mx-2" />

            {/* Rotation controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotateLeft}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotateRight}
              className="text-white hover:bg-white/20"
            >
              <RotateCw className="h-5 w-5" />
            </Button>

            <div className="w-px h-6 bg-white/30 mx-2" />

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={handleWheel}
          onDoubleClick={scale > 1 ? handleResetZoom : handleZoomIn}
        >
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
            draggable={false}
          />
        </div>

        {/* Navigation buttons (only if multiple images) */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                "w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                "w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Thumbnail strip (only if multiple images) */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-2 p-4 bg-gradient-to-t from-black/70 to-transparent">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-white scale-110"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
