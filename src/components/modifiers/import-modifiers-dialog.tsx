"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportModifiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedModifier {
  name: string;
  price: number;
  weight: number;
}

interface ParseError {
  row: number;
  error: string;
}

export function ImportModifiersDialog({
  open,
  onOpenChange,
}: ImportModifiersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedModifier[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const resetState = () => {
    setFile(null);
    setDeleteExisting(false);
    setPreview([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isUploading) {
      if (!newOpen) {
        resetState();
      }
      onOpenChange(newOpen);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === "," || char === ";") && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseErrors([]);

    try {
      const content = await selectedFile.text();
      const lines = content.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        setParseErrors([{ row: 0, error: "El archivo CSV debe tener un encabezado y al menos una fila de datos" }]);
        setPreview([]);
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

      const nameIndex = headers.findIndex(h => h === "name" || h === "nombre" || h === "modifier");
      const priceIndex = headers.findIndex(h => h === "price" || h === "precio");
      const weightIndex = headers.findIndex(h => h === "weight" || h === "peso");

      if (nameIndex === -1 || priceIndex === -1 || weightIndex === -1) {
        const missing = [];
        if (nameIndex === -1) missing.push("name/nombre/modifier");
        if (priceIndex === -1) missing.push("price/precio");
        if (weightIndex === -1) missing.push("weight/peso");
        setParseErrors([{ row: 0, error: `Columnas faltantes: ${missing.join(", ")}` }]);
        setPreview([]);
        return;
      }

      const parsedModifiers: ParsedModifier[] = [];
      const errors: ParseError[] = [];

      const maxPreviewRows = Math.min(lines.length, 101);

      for (let i = 1; i < maxPreviewRows; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        try {
          const name = values[nameIndex]?.trim();
          const priceStr = values[priceIndex]?.trim().replace(/[$,]/g, "");
          const weightStr = values[weightIndex]?.trim().replace(/[g,]/g, "");

          const price = parseFloat(priceStr);
          const weight = parseInt(weightStr, 10);

          if (!name) {
            errors.push({ row: i + 1, error: "Nombre vacío" });
            continue;
          }

          if (isNaN(price) || price < 0) {
            errors.push({ row: i + 1, error: `Precio inválido: ${priceStr}` });
            continue;
          }

          if (isNaN(weight)) {
            errors.push({ row: i + 1, error: `Peso inválido: ${weightStr}` });
            continue;
          }

          parsedModifiers.push({
            name,
            price,
            weight,
          });
        } catch {
          errors.push({ row: i + 1, error: "Error de parseo" });
        }
      }

      setPreview(parsedModifiers);
      setParseErrors(errors);
    } catch (err) {
      console.error("Error parsing CSV:", err);
      setParseErrors([{ row: 0, error: "Error al leer el archivo" }]);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("deleteExisting", deleteExisting.toString());

      const response = await fetch("/api/modifiers/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import modifiers");
      }

      const result = await response.json();

      let message = `Se importaron ${result.imported_count} modifiers`;
      if (result.deleted_count > 0) {
        message += ` (${result.deleted_count} eliminados previamente)`;
      }

      toast.success(message);

      queryClient.invalidateQueries({ queryKey: ["modifiers"] });

      handleOpenChange(false);
    } catch (error) {
      console.error("Error importing modifiers:", error);
      toast.error(error instanceof Error ? error.message : "Error al importar modifiers");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv"))) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const event = { target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(event);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatWeight = (weight: number) => {
    if (weight === 0) return "0g";
    if (weight > 0) return `+${weight}g`;
    return `${weight}g`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importar Modifiers desde CSV</DialogTitle>
              <DialogDescription className="mt-1">
                Carga un archivo CSV con tus modifiers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-modifier-input"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setParseErrors([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label htmlFor="csv-modifier-input" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Arrastra tu archivo CSV aquí</p>
                <p className="text-sm text-muted-foreground mt-1">
                  o haz clic para seleccionar
                </p>
              </label>
            )}
          </div>

          {/* CSV Format Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Formato del CSV:</p>
            <p className="text-xs text-muted-foreground mb-2">
              El archivo debe incluir las columnas: <code className="bg-muted px-1 rounded">name</code> (o nombre, modifier), <code className="bg-muted px-1 rounded">price</code> (o precio), y <code className="bg-muted px-1 rounded">weight</code> (o peso)
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Nota:</strong> El peso puede ser negativo para modifiers que reducen el peso (ej: &quot;Sin queso&quot;)
            </p>
            <div className="bg-background rounded border p-2 text-xs font-mono overflow-x-auto">
              <span className="text-muted-foreground"># Ejemplo:</span><br/>
              name,price,weight<br/>
              Extra Cheese,1.50,50<br/>
              No Onions,0,-20<br/>
              Large Size,3.00,200
            </div>
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    {parseErrors.length} {parseErrors.length === 1 ? "error" : "errores"} encontrados
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    {parseErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        {err.row > 0 ? `Fila ${err.row}: ` : ""}{err.error}
                      </li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li>...y {parseErrors.length - 5} más</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium">
                  Vista previa ({preview.length} {preview.length === 1 ? "modifier" : "modifiers"})
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((modifier, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{modifier.name}</TableCell>
                        <TableCell>{formatPrice(modifier.price)}</TableCell>
                        <TableCell>
                          <Badge variant={modifier.weight >= 0 ? "default" : "destructive"}>
                            {formatWeight(modifier.weight)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 10 && (
                  <div className="text-center py-2 text-sm text-muted-foreground border-t">
                    ...y {preview.length - 10} modifiers más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Existing Option */}
          {file && preview.length > 0 && (
            <div className="flex items-start space-x-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
              <Checkbox
                id="delete-existing-modifiers"
                checked={deleteExisting}
                onCheckedChange={(checked) => setDeleteExisting(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="delete-existing-modifiers"
                  className="font-medium text-amber-700 dark:text-amber-400 cursor-pointer"
                >
                  Eliminar modifiers existentes antes de importar
                </Label>
                <p className="text-sm text-muted-foreground">
                  Si está marcado, todos los modifiers actuales serán eliminados antes de importar los nuevos.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || preview.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar {preview.length > 0 ? `${preview.length} Modifiers` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
