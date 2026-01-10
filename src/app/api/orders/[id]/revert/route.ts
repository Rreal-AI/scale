import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// POST /api/orders/[id]/revert - Revert order to previous status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    // Verificar autenticación
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

    const { id } = await params;

    // Validar que el ID sea un UUID válido
    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    // Buscar la orden actual
    const existingOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.org_id, orgId)),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = existingOrder.status;

    // Determinar nuevo estado
    let newStatus: "pending_weight" | "weighed";
    let clearWeight = false;

    if (currentStatus === "completed") {
      newStatus = "weighed";
    } else if (currentStatus === "weighed") {
      newStatus = "pending_weight";
      clearWeight = true;
    } else {
      return NextResponse.json(
        { error: "Cannot revert from this status" },
        { status: 400 }
      );
    }

    // Actualizar la orden
    const updateData = clearWeight
      ? {
          status: newStatus,
          actual_weight: null,
          delta_weight: null,
          weight_verified_at: null,
          updated_at: new Date(),
        }
      : {
          status: newStatus,
          updated_at: new Date(),
        };

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(and(eq(orders.id, id), eq(orders.org_id, orgId)))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Failed to revert order" },
        { status: 500 }
      );
    }

    const statusLabel =
      newStatus === "pending_weight" ? "Pending Weight" : "Ready for Lockers";

    return NextResponse.json({
      order: updatedOrder,
      message: `Order reverted to ${statusLabel}`,
    });
  } catch (error) {
    console.error("Error reverting order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
