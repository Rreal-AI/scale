import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderEvents } from "@/db/schema";
import { and, eq, lt, inArray, not } from "drizzle-orm";

// GET /api/cron/archive-inactive-orders
// This endpoint should be called by a cron job (Vercel Cron, etc.)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    // Find orders that:
    // 1. Are still pending_weight (not processed)
    // 2. Were created more than 24 hours ago
    // 3. Were last updated more than 24 hours ago (no activity)
    const inactiveOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending_weight"),
          lt(orders.created_at, cutoffTime),
          lt(orders.updated_at, cutoffTime)
        )
      );

    if (inactiveOrders.length === 0) {
      return NextResponse.json({
        message: "No inactive orders to archive",
        archived_count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Archive the orders
    const now = new Date();
    const archiveReason = `Auto-archived due to inactivity (no activity since ${cutoffTime.toISOString()})`;
    const archivedOrders = await db
      .update(orders)
      .set({
        status: "archived",
        archived_at: now,
        archived_reason: archiveReason,
        updated_at: now,
      })
      .where(
        inArray(
          orders.id,
          inactiveOrders.map((o) => o.id)
        )
      )
      .returning();

    // Create audit events for auto-archived orders
    if (archivedOrders.length > 0) {
      await db.insert(orderEvents).values(
        archivedOrders.map((order) => ({
          order_id: order.id,
          org_id: order.org_id,
          event_type: "archived" as const,
          event_data: {
            reason: archiveReason,
            auto_archived: true,
          },
          actor_id: null,
        }))
      );
    }

    return NextResponse.json({
      message: "Orders archived successfully",
      archived_count: archivedOrders.length,
      archived_order_ids: archivedOrders.map((o) => o.id),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error archiving inactive orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
