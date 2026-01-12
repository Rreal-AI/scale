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
  onOpenChange: (open: boolean) => void;
  onCapture: (images: string[]) => void;
  isProcessing?: boolean;
}

type CameraState = "idle" | "requesting" | "streaming" | "error";

export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
  isProcessing = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setErrorMessage("");
    setFlashSupported(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check if flash/torch is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.();
        if (capabilities && "torch" in capabilities) {
          setFlashSupported(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("streaming");
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraState("error");

      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            setErrorMessage(
              "Permiso de camara denegado. Por favor habilita el acceso a la camara en la configuracion del navegador."
            );
            break;
          case "NotFoundError":
            setErrorMessage("No se encontro una camara en este dispositivo.");
            break;
          case "NotReadableError":
            setErrorMessage("La camara esta siendo usada por otra aplicacion.");
            break;
          default:
            setErrorMessage(
              "Error al acceder a la camara. Por favor intenta de nuevo."
            );
        }
      } else {
        setErrorMessage("Error inesperado al acceder a la camara.");
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFlashEnabled(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const newFlashState = !flashEnabled;
      await videoTrack.applyConstraints({
        advanced: [{ torch: newFlashState } as MediaTrackConstraintSet],
      });
      setFlashEnabled(newFlashState);
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
      stopCamera();
      onCapture(capturedImages);
    }
  }, [capturedImages, onCapture, stopCamera]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  useEffect(() => {
    if (open && cameraState === "idle") {
      startCamera();
    }
  }, [open, cameraState, startCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCameraState("idle");
      setCapturedImages([]);
      setErrorMessage("");
    }
  }, [open, stopCamera]);

  useEffect(() => {
    if (cameraState === "streaming") {
      stopCamera();
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Verificacion Visual del Pedido
          </DialogTitle>
          <DialogDescription>
            Toma fotos del pedido preparado para verificar que todos los items
            esten presentes. Puedes capturar multiples imagenes.
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
                  <p>Accediendo a la camara...</p>
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
                    Reintentar
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
                Fotos ({capturedImages.length})
              </p>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                {capturedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Captura ${index + 1}`}
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
              ? "Captura al menos una foto"
              : `${capturedImages.length} foto${capturedImages.length > 1 ? "s" : ""} capturada${capturedImages.length > 1 ? "s" : ""}`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
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
                  Analizando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Verificar ({capturedImages.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
