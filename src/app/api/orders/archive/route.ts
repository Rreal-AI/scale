import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

// POST /api/orders/archive - Manually archive one or more orders
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
      order_ids: z.array(z.string().uuid()).min(1),
      reason: z.string().optional(),
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

    const { order_ids, reason } = parsed.data;

    // Archive the orders
    const now = new Date();
    const archivedOrders = await db
      .update(orders)
      .set({
        status: "archived",
        archived_at: now,
        archived_reason: reason || "Manually archived",
        updated_at: now,
      })
      .where(and(eq(orders.org_id, orgId), inArray(orders.id, order_ids)))
      .returning();

    return NextResponse.json({
      message: "Orders archived successfully",
      archived_count: archivedOrders.length,
      archived_orders: archivedOrders,
    });
  } catch (error) {
    console.error("Error archiving orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/orders/archive - Unarchive orders (restore them)
export async function PUT(request: NextRequest) {
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
      order_ids: z.array(z.string().uuid()).min(1),
      restore_status: z
        .enum(["pending_weight", "weighed", "completed", "cancelled"])
        .default("pending_weight"),
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

    const { order_ids, restore_status } = parsed.data;

    // Unarchive the orders
    const now = new Date();
    const unarchivedOrders = await db
      .update(orders)
      .set({
        status: restore_status,
        archived_at: null,
        archived_reason: null,
        updated_at: now,
      })
      .where(
        and(
          eq(orders.org_id, orgId),
          inArray(orders.id, order_ids),
          eq(orders.status, "archived")
        )
      )
      .returning();

    return NextResponse.json({
      message: "Orders unarchived successfully",
      unarchived_count: unarchivedOrders.length,
      unarchived_orders: unarchivedOrders,
    });
  } catch (error) {
    console.error("Error unarchiving orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
