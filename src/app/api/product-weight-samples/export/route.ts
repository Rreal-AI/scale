import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productWeightSamples, products } from "@/db/schema";
import { and, eq, asc, desc } from "drizzle-orm";

// GET /api/product-weight-samples/export - Export weight samples to CSV
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const product_id = searchParams.get("product_id") || undefined;
    const is_single_product = searchParams.get("is_single_product");
    const sort_by =
      (searchParams.get("sort_by") as "weight" | "created_at") || "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    // Build conditions
    const conditions = [eq(productWeightSamples.org_id, orgId)];

    if (product_id) {
      conditions.push(eq(productWeightSamples.product_id, product_id));
    }

    if (is_single_product !== null && is_single_product !== undefined) {
      conditions.push(eq(productWeightSamples.is_single_product, is_single_product === "true"));
    }

    // Build order
    const orderColumn =
      sort_by === "weight"
        ? productWeightSamples.weight
        : productWeightSamples.created_at;
    const orderDirection = sort_order === "asc" ? asc : desc;

    // Fetch all samples (no pagination for export)
    const samplesList = await db
      .select({
        id: productWeightSamples.id,
        weight: productWeightSamples.weight,
        item_count: productWeightSamples.item_count,
        is_single_product: productWeightSamples.is_single_product,
        check_number: productWeightSamples.check_number,
        items_summary: productWeightSamples.items_summary,
        created_at: productWeightSamples.created_at,
        product_name: products.name,
      })
      .from(productWeightSamples)
      .leftJoin(products, eq(productWeightSamples.product_id, products.id))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn));

    // Convert grams to ounces
    const gramsToOunces = (grams: number) => (grams / 28.3495).toFixed(2);

    // Build CSV content
    const headers = ["Date", "Check Number", "Items", "Item Count", "Type", "Weight (oz)", "Weight (g)"];
    const rows = samplesList.map((sample) => {
      const date = sample.created_at
        ? new Date(sample.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : "";
      const checkNumber = sample.check_number || "";
      const items = sample.is_single_product
        ? sample.product_name || "Unknown Product"
        : sample.items_summary || "Multiple Items";
      const itemCount = sample.item_count || 1;
      const type = sample.is_single_product ? "Single" : "Multi";
      const weightOz = gramsToOunces(sample.weight);
      const weightG = sample.weight;

      // Escape fields that might contain commas or quotes
      const escapeField = (field: string | number) => {
        const str = String(field);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeField(date),
        escapeField(checkNumber),
        escapeField(items),
        escapeField(itemCount),
        escapeField(type),
        escapeField(weightOz),
        escapeField(weightG),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    // Return CSV file
    const filename = `weight-samples-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting weight samples:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
