import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, count } from "drizzle-orm";

// DELETE /api/products/delete-all - Delete all products for the organization
export async function DELETE() {
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

    // Get count before deletion
    const countResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.org_id, orgId));
    
    const totalCount = countResult[0]?.count || 0;

    // Delete all products for this organization
    const deletedProducts = await db
      .delete(products)
      .where(eq(products.org_id, orgId))
      .returning();

    return NextResponse.json({
      message: "All products deleted successfully",
      deleted_count: deletedProducts.length,
      total_before_deletion: totalCount,
    });
  } catch (error) {
    console.error("Error deleting all products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/products/delete-all - Get count of products that would be deleted
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

    // Get count of products
    const countResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.org_id, orgId));
    
    const totalCount = countResult[0]?.count || 0;

    return NextResponse.json({
      count: totalCount,
    });
  } catch (error) {
    console.error("Error getting products count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

