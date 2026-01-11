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
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  SwitchCamera,
} from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageBase64: string) => void;
  isProcessing?: boolean;
}

type CameraState = "idle" | "requesting" | "streaming" | "captured" | "error";

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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    setErrorMessage("");

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
  }, []);

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
    setCapturedImage(imageBase64);
    setCameraState("captured");

    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

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
      setCapturedImage(null);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Verificacion Visual del Pedido
          </DialogTitle>
          <DialogDescription>
            Toma una foto del pedido preparado para verificar que todos los
            items esten presentes.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
          {cameraState === "streaming" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {cameraState === "captured" && capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {cameraState === "requesting" && (
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
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          {cameraState === "streaming" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
            </>
          )}

          {cameraState === "captured" && (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repetir
              </Button>
              <Button
                onClick={confirmPhoto}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Verificar
                  </>
                )}
              </Button>
            </>
          )}

          {cameraState === "error" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
