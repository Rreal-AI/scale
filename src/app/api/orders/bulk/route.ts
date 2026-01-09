import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

// DELETE /api/orders/bulk - Permanently delete multiple orders
// Note: order_items and order_item_modifiers are deleted automatically via CASCADE
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

    const schema = z.object({
      order_ids: z.array(z.string().uuid()).min(1).max(100),
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

    const { order_ids } = parsed.data;

    // Delete orders - CASCADE will handle order_items and order_item_modifiers
    const deletedOrders = await db
      .delete(orders)
      .where(and(eq(orders.org_id, orgId), inArray(orders.id, order_ids)))
      .returning({ id: orders.id });

    return NextResponse.json({
      message: "Orders deleted successfully",
      deleted_count: deletedOrders.length,
      deleted_ids: deletedOrders.map((o) => o.id),
    });
  } catch (error) {
    console.error("Error deleting orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
