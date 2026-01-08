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

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedProduct {
  name: string;
  price: number;
  weight: number;
  category?: string;
}

interface ParseError {
  row: number;
  error: string;
}

export function ImportProductsDialog({
  open,
  onOpenChange,
}: ImportProductsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedProduct[]>([]);
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

    // Parse file for preview
    try {
      const content = await selectedFile.text();
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        setParseErrors([{ row: 0, error: "El archivo CSV debe tener un encabezado y al menos una fila de datos" }]);
        setPreview([]);
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      
      const nameIndex = headers.findIndex(h => h === "name" || h === "nombre" || h === "producto");
      const priceIndex = headers.findIndex(h => h === "price" || h === "precio");
      const weightIndex = headers.findIndex(h => h === "weight" || h === "peso");
      const weightOzIndex = headers.findIndex(h => h === "weight_oz" || h === "peso_oz" || h === "peso oz" || h === "weight oz");
      const categoryIndex = headers.findIndex(h => h === "category" || h === "categoria" || h === "categoría");

      if (nameIndex === -1 || priceIndex === -1 || (weightIndex === -1 && weightOzIndex === -1)) {
        const missing = [];
        if (nameIndex === -1) missing.push("name/nombre/producto");
        if (priceIndex === -1) missing.push("price/precio");
        if (weightIndex === -1 && weightOzIndex === -1) missing.push("weight/peso o weight_oz/peso_oz");
        setParseErrors([{ row: 0, error: `Columnas faltantes: ${missing.join(", ")}` }]);
        setPreview([]);
        return;
      }

      const parsedProducts: ParsedProduct[] = [];
      const errors: ParseError[] = [];

      // Parse up to 100 rows for preview
      const maxPreviewRows = Math.min(lines.length, 101);
      
      for (let i = 1; i < maxPreviewRows; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        
        try {
          const name = values[nameIndex]?.trim();
          const priceStr = values[priceIndex]?.trim().replace(/[$,]/g, "");
          const category = categoryIndex !== -1 ? values[categoryIndex]?.trim() : undefined;

          const price = parseFloat(priceStr);
          
          // Parse weight - can be in grams or ounces
          let weight: number;
          let weightSource: string;
          
          if (weightOzIndex !== -1 && values[weightOzIndex]?.trim()) {
            // Weight in ounces - convert to grams
            const weightOzStr = values[weightOzIndex]?.trim().replace(/[oz,]/gi, "");
            const weightOz = parseFloat(weightOzStr);
            weight = Math.round(weightOz * 28.3495);
            weightSource = `${weightOzStr} oz`;
          } else if (weightIndex !== -1 && values[weightIndex]?.trim()) {
            // Weight in grams - check if it includes "oz" suffix
            let weightStr = values[weightIndex]?.trim();
            
            if (weightStr.toLowerCase().endsWith("oz")) {
              const weightOz = parseFloat(weightStr.replace(/[oz,]/gi, ""));
              weight = Math.round(weightOz * 28.3495);
              weightSource = weightStr;
            } else {
              weightStr = weightStr.replace(/[g,]/g, "");
              weight = parseInt(weightStr, 10);
              weightSource = `${weightStr}g`;
            }
          } else {
            errors.push({ row: i + 1, error: "Peso vacío" });
            continue;
          }

          if (!name) {
            errors.push({ row: i + 1, error: "Nombre vacío" });
            continue;
          }

          if (isNaN(price) || price < 0) {
            errors.push({ row: i + 1, error: `Precio inválido: ${priceStr}` });
            continue;
          }

          if (isNaN(weight) || weight <= 0) {
            errors.push({ row: i + 1, error: `Peso inválido: ${weightSource}` });
            continue;
          }

          parsedProducts.push({
            name,
            price,
            weight,
            category: category || undefined,
          });
        } catch (err) {
          errors.push({ row: i + 1, error: "Error de parseo" });
        }
      }

      setPreview(parsedProducts);
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

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import products");
      }

      const result = await response.json();
      
      let message = `Se importaron ${result.imported_count} productos`;
      if (result.deleted_count > 0) {
        message += ` (${result.deleted_count} eliminados previamente)`;
      }
      if (result.categories_created > 0) {
        message += `. Se crearon ${result.categories_created} categorías nuevas`;
      }
      
      toast.success(message);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      
      handleOpenChange(false);
    } catch (error) {
      console.error("Error importing products:", error);
      toast.error(error instanceof Error ? error.message : "Error al importar productos");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importar Productos desde CSV</DialogTitle>
              <DialogDescription className="mt-1">
                Carga un archivo CSV con tus productos
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
              id="csv-file-input"
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
              <label htmlFor="csv-file-input" className="cursor-pointer">
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
              El archivo debe incluir las columnas: <code className="bg-muted px-1 rounded">name</code> (o nombre, producto), <code className="bg-muted px-1 rounded">price</code> (o precio), y opcionalmente <code className="bg-muted px-1 rounded">category</code> (o categoria)
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              <strong>Para el peso:</strong> usa <code className="bg-muted px-1 rounded">weight</code> (o peso) en gramos, o <code className="bg-muted px-1 rounded">weight_oz</code> (o peso_oz) en onzas. También puedes agregar &quot;oz&quot; al final del valor (ej: &quot;16oz&quot;) para conversión automática.
            </p>
            <div className="bg-background rounded border p-2 text-xs font-mono overflow-x-auto">
              <span className="text-muted-foreground"># Ejemplo con gramos:</span><br/>
              name,price,weight,category<br/>
              Hamburguesa Clásica,12.99,450,Hamburguesas<br/>
              <br/>
              <span className="text-muted-foreground"># Ejemplo con onzas:</span><br/>
              name,price,weight_oz,category<br/>
              Hamburguesa Clásica,12.99,16,Hamburguesas<br/>
              <br/>
              <span className="text-muted-foreground"># O con sufijo oz:</span><br/>
              name,price,weight,category<br/>
              Hamburguesa Clásica,12.99,16oz,Hamburguesas
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
                  Vista previa ({preview.length} {preview.length === 1 ? "producto" : "productos"})
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Peso (g)</TableHead>
                      <TableHead>Categoría</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((product, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{formatPrice(product.price)}</TableCell>
                        <TableCell>{product.weight}g</TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="secondary">{product.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 10 && (
                  <div className="text-center py-2 text-sm text-muted-foreground border-t">
                    ...y {preview.length - 10} productos más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Existing Option */}
          {file && preview.length > 0 && (
            <div className="flex items-start space-x-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
              <Checkbox
                id="delete-existing"
                checked={deleteExisting}
                onCheckedChange={(checked) => setDeleteExisting(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="delete-existing"
                  className="font-medium text-amber-700 dark:text-amber-400 cursor-pointer"
                >
                  Eliminar productos existentes antes de importar
                </Label>
                <p className="text-sm text-muted-foreground">
                  Si está marcado, todos los productos actuales serán eliminados antes de importar los nuevos.
                  Usa esto si quieres reemplazar completamente tu catálogo.
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
                Importar {preview.length > 0 ? `${preview.length} Productos` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

