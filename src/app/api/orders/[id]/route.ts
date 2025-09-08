import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// GET /api/orders/[id] - Obtener una order específica con todas las relaciones
export async function GET(
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

    // Buscar la order con todas las relaciones usando db.query
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.org_id, orgId)),
      with: {
        items: {
          with: {
            product: true,
            modifiers: {
              with: {
                modifier: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Schema for weight update
const updateWeightSchema = z.object({
  actual_weight: z.number().positive("Actual weight must be positive"),
  status: z.enum(["weighed", "completed"]).optional(),
});

// PUT /api/orders/[id] - Update order weight and status
export async function PUT(
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

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = updateWeightSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: parseResult.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { actual_weight, status } = parseResult.data;

    // Buscar la orden
    const existingOrder = await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.org_id, orgId)),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calcular delta weight
    const expected_weight = existingOrder.expected_weight || 0;
    const delta_weight = actual_weight - expected_weight;

    // Actualizar la orden
    const [updatedOrder] = await db
      .update(orders)
      .set({
        actual_weight,
        delta_weight,
        // If status provided use it, otherwise default to completed
        status: status ?? "completed",
        weight_verified_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.org_id, orgId)))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order: updatedOrder,
      message:
        (status ?? "completed") === "weighed"
          ? "Order weight updated and marked as ready for lockers"
          : "Order weight updated and marked as completed",
    });
  } catch (error) {
    console.error("Error updating order weight:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
