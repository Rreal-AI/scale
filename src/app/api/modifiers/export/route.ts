import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { modifiers } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/modifiers/export - Export all modifiers as CSV
export async function GET() {
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

    // Fetch all modifiers for the organization
    const allModifiers = await db
      .select({
        name: modifiers.name,
        price: modifiers.price,
        weight: modifiers.weight,
      })
      .from(modifiers)
      .where(eq(modifiers.org_id, orgId))
      .orderBy(modifiers.name);

    // Generate CSV content
    const csvLines: string[] = [];

    // Header row
    csvLines.push("name,price,weight");

    // Data rows
    for (const modifier of allModifiers) {
      // Escape name if it contains commas, quotes, or newlines
      let name = modifier.name;
      if (name.includes(",") || name.includes('"') || name.includes("\n")) {
        name = `"${name.replace(/"/g, '""')}"`;
      }

      // Convert price from cents to dollars
      const price = (modifier.price / 100).toFixed(2);

      // Weight is already in grams (can be negative)
      const weight = modifier.weight.toString();

      csvLines.push(`${name},${price},${weight}`);
    }

    const csvContent = csvLines.join("\n");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `modifiers-${timestamp}.csv`;

    // Return as downloadable CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting modifiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
