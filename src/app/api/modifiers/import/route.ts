import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { modifiers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Schema for validating CSV row
const csvRowSchema = z.object({
  name: z.string().min(1, "Modifier name is required"),
  price: z.number().nonnegative("Price must be zero or positive"),
  weight: z.number().int("Weight must be an integer"),
});

type CSVRow = z.infer<typeof csvRowSchema>;

// POST /api/modifiers/import - Import modifiers from CSV
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User ID required" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Forbidden - Organization ID required" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deleteExisting = formData.get("deleteExisting") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read and parse CSV content
    const csvContent = await file.text();
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

    // Validate required columns
    const nameIndex = headers.findIndex(h => h === "name" || h === "nombre" || h === "modifier");
    const priceIndex = headers.findIndex(h => h === "price" || h === "precio");
    const weightIndex = headers.findIndex(h => h === "weight" || h === "peso");

    if (nameIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'name' (or 'nombre', 'modifier') column" },
        { status: 400 }
      );
    }

    if (priceIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'price' (or 'precio') column" },
        { status: 400 }
      );
    }

    if (weightIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'weight' (or 'peso') column" },
        { status: 400 }
      );
    }

    // Parse data rows
    const parsedModifiers: CSVRow[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
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
          errors.push({ row: i + 1, error: "Modifier name is empty" });
          continue;
        }

        if (isNaN(price) || price < 0) {
          errors.push({ row: i + 1, error: `Invalid price: ${priceStr}` });
          continue;
        }

        if (isNaN(weight)) {
          errors.push({ row: i + 1, error: `Invalid weight: ${weightStr}` });
          continue;
        }

        const validatedRow = csvRowSchema.safeParse({
          name,
          price,
          weight,
        });

        if (!validatedRow.success) {
          errors.push({ row: i + 1, error: validatedRow.error.issues[0]?.message || "Validation error" });
          continue;
        }

        parsedModifiers.push(validatedRow.data);
      } catch (err) {
        errors.push({ row: i + 1, error: `Parse error: ${err instanceof Error ? err.message : "Unknown error"}` });
      }
    }

    if (parsedModifiers.length === 0) {
      return NextResponse.json(
        {
          error: "No valid modifiers found in CSV",
          errors: errors.slice(0, 10)
        },
        { status: 400 }
      );
    }

    // Delete existing modifiers if requested
    let deletedCount = 0;
    if (deleteExisting) {
      const deleted = await db
        .delete(modifiers)
        .where(eq(modifiers.org_id, orgId))
        .returning();
      deletedCount = deleted.length;
    }

    // Insert new modifiers
    const modifiersToInsert = parsedModifiers.map(m => ({
      name: m.name,
      price: Math.round(m.price * 100), // Convert to cents
      weight: m.weight, // Already in grams (can be negative)
      org_id: orgId,
    }));

    const insertedModifiers = await db
      .insert(modifiers)
      .values(modifiersToInsert)
      .returning();

    return NextResponse.json({
      message: "Modifiers imported successfully",
      imported_count: insertedModifiers.length,
      deleted_count: deletedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      warnings_count: errors.length,
    });
  } catch (error) {
    console.error("Error importing modifiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to parse CSV line properly (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";") && !inQuotes) {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Don't forget the last field
  result.push(current);

  return result;
}
