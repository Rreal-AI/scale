import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

// POST /api/products/bulk-update-category - Update category for multiple products
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

    const schema = z.object({
      product_ids: z.array(z.string().uuid()).min(1),
      category_id: z.string().uuid().nullable(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { product_ids, category_id } = parsed.data;

    // Update the products' category
    const now = new Date();
    const updatedProducts = await db
      .update(products)
      .set({
        category_id,
        updated_at: now,
      })
      .where(and(eq(products.org_id, orgId), inArray(products.id, product_ids)))
      .returning();

    return NextResponse.json({
      message: "Products updated successfully",
      updated_count: updatedProducts.length,
      updated_products: updatedProducts,
    });
  } catch (error) {
    console.error("Error updating products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
