import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq, inArray, ilike, or, SQL } from "drizzle-orm";
import { z } from "zod";

// Schema for filters when using select_all mode
const filtersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["pending_weight", "weighed", "completed", "cancelled", "archived"]).optional(),
  type: z.enum(["delivery", "takeout"]).optional(),
});

// Union schema: either order_ids array OR select_all with optional filters
const requestSchema = z.union([
  z.object({
    order_ids: z.array(z.string().uuid()).min(1).max(1000),
  }),
  z.object({
    select_all: z.literal(true),
    filters: filtersSchema.optional(),
  }),
]);

// DELETE /api/orders/bulk - Permanently delete multiple orders
// Note: order_items and order_item_modifiers are deleted automatically via CASCADE
// Supports two modes:
// 1. { order_ids: string[] } - Delete specific orders by ID
// 2. { select_all: true, filters?: {...} } - Delete all orders matching filters
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

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    let deletedOrders: { id: string }[];

    if ("order_ids" in parsed.data) {
      // Mode 1: Delete by specific IDs
      const { order_ids } = parsed.data;

      deletedOrders = await db
        .delete(orders)
        .where(and(eq(orders.org_id, orgId), inArray(orders.id, order_ids)))
        .returning({ id: orders.id });
    } else {
      // Mode 2: Delete all matching filters (select_all mode)
      const { filters } = parsed.data;

      // Build conditions array
      const conditions: SQL[] = [eq(orders.org_id, orgId)];

      if (filters?.status) {
        conditions.push(eq(orders.status, filters.status));
      }

      if (filters?.type) {
        conditions.push(eq(orders.type, filters.type));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(orders.customer_name, searchTerm),
            ilike(orders.check_number, searchTerm),
            ilike(orders.customer_email, searchTerm),
            ilike(orders.customer_phone, searchTerm)
          )!
        );
      }

      deletedOrders = await db
        .delete(orders)
        .where(and(...conditions))
        .returning({ id: orders.id });
    }

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
