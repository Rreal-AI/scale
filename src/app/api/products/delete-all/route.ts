import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, orderItems } from "@/db/schema";
import { eq, count, inArray } from "drizzle-orm";

// DELETE /api/products/delete-all - Delete all products for the organization
export async function DELETE(request: NextRequest) {
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

    // Check if force delete is requested
    const searchParams = request.nextUrl.searchParams;
    const forceDelete = searchParams.get("force") === "true";

    // Get all products for this organization
    const orgProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.org_id, orgId));
    
    const totalCount = orgProducts.length;
    const productIds = orgProducts.map(p => p.id);

    if (productIds.length === 0) {
      return NextResponse.json({
        message: "No products to delete",
        deleted_count: 0,
        total_before_deletion: 0,
      });
    }

    // Check if any products are referenced by order items
    const referencedItems = await db
      .select({ product_id: orderItems.product_id })
      .from(orderItems)
      .where(inArray(orderItems.product_id, productIds));
    
    const referencedProductIds = new Set(referencedItems.map(item => item.product_id));

    if (referencedProductIds.size > 0 && !forceDelete) {
      return NextResponse.json(
        { 
          error: "Some products are referenced by existing orders",
          referenced_count: referencedProductIds.size,
          total_count: totalCount,
          message: "Use force=true to delete anyway (this will also delete the order item references)"
        },
        { status: 409 }
      );
    }

    // If force delete, first remove the order items that reference these products
    if (forceDelete && referencedProductIds.size > 0) {
      await db
        .delete(orderItems)
        .where(inArray(orderItems.product_id, productIds));
    }

    // Delete all products for this organization
    const deletedProducts = await db
      .delete(products)
      .where(eq(products.org_id, orgId))
      .returning();

    return NextResponse.json({
      message: "All products deleted successfully",
      deleted_count: deletedProducts.length,
      total_before_deletion: totalCount,
      order_items_removed: forceDelete ? referencedItems.length : 0,
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

