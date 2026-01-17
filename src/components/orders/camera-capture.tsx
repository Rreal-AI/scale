"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera,
  Check,
  Loader2,
  AlertCircle,
  SwitchCamera,
  X,
  Zap,
  ZapOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  open: boolean;
  orderId?: string;
  onOpenChange: (open: boolean) => void;
  onCapture: (images: string[]) => void;
  isProcessing?: boolean;
}

// Draft management functions
const saveDraft = (orderId: string, images: string[]) => {
  if (images.length > 0) {
    try {
      localStorage.setItem(`camera-draft-${orderId}`, JSON.stringify(images));
    } catch (error) {
      // QuotaExceededError - clear old drafts and try again
      console.error("Failed to save draft:", error);
      try {
        // Clear all camera drafts to free space
        Object.keys(localStorage)
          .filter(key => key.startsWith("camera-draft-"))
          .forEach(key => localStorage.removeItem(key));
        // Try again
        localStorage.setItem(`camera-draft-${orderId}`, JSON.stringify(images));
      } catch {
        // Still failed, give up silently
        console.error("Failed to save draft after clearing");
      }
    }
  }
};

const loadDraft = (orderId: string): string[] => {
  try {
    const saved = localStorage.getItem(`camera-draft-${orderId}`);
    if (!saved) return [];

    const parsed = JSON.parse(saved);

    // Validate that it's an array of strings (base64 images)
    if (!Array.isArray(parsed)) return [];
    if (!parsed.every(item => typeof item === "string" && item.startsWith("data:image/"))) {
      // Invalid data, clear it
      localStorage.removeItem(`camera-draft-${orderId}`);
      return [];
    }

    return parsed;
  } catch {
    // Clear corrupted data
    try {
      localStorage.removeItem(`camera-draft-${orderId}`);
    } catch {}
    return [];
  }
};

const clearDraft = (orderId: string) => {
  try {
    localStorage.removeItem(`camera-draft-${orderId}`);
  } catch {
    // Ignore errors when clearing
  }
};

type CameraState = "idle" | "requesting" | "streaming" | "error";

export function CameraCapture({
  open,
  orderId,
  onOpenChange,
  onCapture,
  isProcessing = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Store orderId when modal opens (before it can change externally)
  const activeOrderIdRef = useRef<string | null>(null);
  // Ref to track mounted state and cleanup timeout
  const isMountedRef = useRef(true);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Lock to prevent concurrent startCamera calls
  const isStartingRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);

  const startCamera = useCallback(async () => {
    // Check if still mounted and not already starting
    if (!isMountedRef.current || isStartingRef.current) return;
    isStartingRef.current = true;

    setCameraState("requesting");
    setErrorMessage("");
    setFlashSupported(false);

    try {
      // Clean up any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Simplified constraints for faster camera initialization on mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });

      // Check if still mounted after async operation
      if (!isMountedRef.current) {
        // Stop the stream immediately if component unmounted
        stream.getTracks().forEach((track) => track.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          // AbortError occurs when play() is interrupted (e.g., component unmounts)
          if (playError instanceof DOMException && playError.name === "AbortError") {
            console.log("Video play was aborted - component likely unmounted");
            isStartingRef.current = false;
            return;
          }
          throw playError;
        }

        // Check if still mounted after play
        if (!isMountedRef.current) {
          // Stop the stream if component unmounted during play
          stream.getTracks().forEach((track) => track.stop());
          isStartingRef.current = false;
          return;
        }

        setCameraState("streaming");
      }

      // Check torch support AFTER video is playing (non-blocking)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Clear any existing timeout
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }
        // Use setTimeout to avoid blocking the main thread
        flashTimeoutRef.current = setTimeout(() => {
          // Only update state if component is still mounted
          if (isMountedRef.current && streamRef.current) {
            try {
              const capabilities = videoTrack.getCapabilities?.();
              if (capabilities && "torch" in capabilities) {
                setFlashSupported(true);
              }
            } catch {
              // Track may have been stopped, ignore
            }
          }
        }, 100);
      }
    } catch (error) {
      // Check if still mounted before setting error state
      if (!isMountedRef.current) return;

      console.error("Camera access error:", error);
      setCameraState("error");

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            setErrorMessage(
              "Camera permission denied. Please enable camera access in browser settings."
            );
            break;
          case "NotFoundError":
            setErrorMessage("No camera found on this device.");
            break;
          case "NotReadableError":
            setErrorMessage("Camera is being used by another application.");
            break;
          default:
            setErrorMessage(
              "Error accessing camera. Please try again."
            );
        }
      } else {
        setErrorMessage("Unexpected error accessing camera.");
      }
    } finally {
      // Always reset the lock when done
      isStartingRef.current = false;
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    // Clear flash detection timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Track may already be stopped
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error("Error stopping camera:", error);
    }
    if (isMountedRef.current) {
      setFlashEnabled(false);
    }
  }, []);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Reset locks
      isStartingRef.current = false;
      // Cleanup timeout on unmount
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      // Stop any active streams on unmount
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {
              // Ignore errors when stopping tracks
            }
          });
        } catch {
          // Ignore cleanup errors
        }
        streamRef.current = null;
      }
    };
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !isMountedRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const newFlashState = !flashEnabled;
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashState } as MediaTrackConstraintSet],
      });
      if (isMountedRef.current) {
        setFlashEnabled(newFlashState);
      }
    } catch (error) {
      console.error("Error toggling flash:", error);
    }
  }, [flashEnabled]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImages((prev) => [...prev, imageBase64]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const confirmPhotos = useCallback(() => {
    if (capturedImages.length > 0) {
      if (activeOrderIdRef.current) clearDraft(activeOrderIdRef.current);
      stopCamera();
      onCapture(capturedImages);
    }
  }, [capturedImages, onCapture, stopCamera]);

  // Explicit cancel - clears draft
  const handleCancel = useCallback(() => {
    if (activeOrderIdRef.current) clearDraft(activeOrderIdRef.current);
    setCapturedImages([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  useEffect(() => {
    if (open && cameraState === "idle" && isMountedRef.current) {
      startCamera();
    }
  }, [open, cameraState, startCamera]);

  // Capture orderId when modal opens (before it can change externally)
  useEffect(() => {
    if (open && orderId) {
      activeOrderIdRef.current = orderId;
    }
  }, [open, orderId]);

  // Save draft and cleanup when closing modal
  useEffect(() => {
    if (!open) {
      // Save draft if there are captured images (use ref for stable orderId)
      if (activeOrderIdRef.current && capturedImages.length > 0) {
        saveDraft(activeOrderIdRef.current, capturedImages);
      }

      // Stop camera and clear all locks
      stopCamera();
      isStartingRef.current = false;

      // Reset all states if still mounted
      if (isMountedRef.current) {
        setCameraState("idle");
        setErrorMessage("");
        setFlashSupported(false);
        setFlashEnabled(false);
      }
    }
  }, [open, stopCamera, capturedImages]);

  // Load draft when opening modal
  useEffect(() => {
    if (open && orderId && isMountedRef.current) {
      const draft = loadDraft(orderId);
      if (draft.length > 0) {
        setCapturedImages(draft);
      } else {
        setCapturedImages([]);
      }
    }
  }, [open, orderId]);

  // Handle facingMode changes - stop camera and set idle to trigger restart
  useEffect(() => {
    if (cameraState === "streaming" && isMountedRef.current) {
      stopCamera();
      // Setting to idle will trigger the open/cameraState effect to restart
      // with the new facingMode, avoiding race conditions
      setCameraState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Visual Order Verification
          </DialogTitle>
          <DialogDescription>
            Take photos of the prepared order to verify that all items
            are present. You can capture multiple images.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Camera View */}
          <div className="flex-1 relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraState === "streaming" ? "block" : "hidden"}`}
            />

            {(cameraState === "requesting" || cameraState === "idle") && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Accessing camera...</p>
                </div>
              </div>
            )}

            {cameraState === "error" && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center text-white">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm">{errorMessage}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {cameraState === "streaming" && (
              <>
                {/* Top controls */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {/* Flash toggle */}
                  {flashSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFlash}
                      className={cn(
                        "bg-black/50 text-white hover:bg-black/70",
                        flashEnabled && "bg-yellow-500/80 hover:bg-yellow-500"
                      )}
                    >
                      {flashEnabled ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <ZapOff className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {/* Switch camera */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="bg-black/50 text-white hover:bg-black/70"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </div>

                {/* Flash indicator */}
                {flashEnabled && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Flash ON
                  </div>
                )}

                {/* Capture button overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 border-4 border-gray-300"
                  >
                    <Camera className="h-6 w-6 text-gray-800" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Captured Images Sidebar */}
          {capturedImages.length > 0 && (
            <div className="w-32 flex flex-col gap-2">
              <p className="text-xs text-gray-500 font-medium">
                Photos ({capturedImages.length})
              </p>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                {capturedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Capture ${index + 1}`}
                      className="w-full aspect-[4/3] object-cover rounded-md border-2 border-gray-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="text-sm text-gray-500">
            {capturedImages.length === 0
              ? "Capture at least one photo"
              : `${capturedImages.length} photo${capturedImages.length > 1 ? "s" : ""} captured`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPhotos}
              disabled={isProcessing || capturedImages.length === 0}
              className={cn(
                capturedImages.length > 0
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Verify ({capturedImages.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
