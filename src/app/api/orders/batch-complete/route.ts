import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

// Schema for batch completion
const batchCompleteSchema = z.object({
  order_ids: z.array(z.string().uuid("Invalid order ID format")).min(1, "At least one order ID is required"),
});

// POST /api/orders/batch-complete - Complete multiple orders ready for lockers
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    // Verificar autenticación
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parsear el cuerpo de la solicitud
    const body = await request.json();
    const validation = batchCompleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { order_ids } = validation.data;

    // Verificar que todas las órdenes existan y estén en estado ready_for_lockers
    const existingOrders = await db.query.orders.findMany({
      where: and(
        inArray(orders.id, order_ids),
        eq(orders.org_id, orgId),
        eq(orders.status, "ready_for_lockers")
      ),
    });

    if (existingOrders.length !== order_ids.length) {
      return NextResponse.json(
        { error: "Some orders not found or not ready for completion" },
        { status: 400 }
      );
    }

    // Actualizar todas las órdenes a completed
    const updatedOrders = await db
      .update(orders)
      .set({
        status: "completed",
        updated_at: new Date(),
      })
      .where(
        and(
          inArray(orders.id, order_ids),
          eq(orders.org_id, orgId),
          eq(orders.status, "ready_for_lockers")
        )
      )
      .returning();

    return NextResponse.json({
      message: `Successfully completed ${updatedOrders.length} orders`,
      completed_orders: updatedOrders.map(order => ({
        id: order.id,
        check_number: order.check_number,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("Error completing orders batch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}