import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders, orderItems, products, modifiers } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

// POST /api/products/[id]/recalculate-orders - Recalcular expected_weight de órdenes que usan este producto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: productId } = await params;

    // Verificar que el producto existe y pertenece a la organización
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.org_id, orgId)),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Obtener órdenes que usan este producto (solo órdenes pendientes de peso)
    // const affectedOrders = await db.query.orders.findMany({
    //   where: and(
    //     eq(orders.org_id, orgId),
    //     eq(orders.status, "pending_weight")
    //   ),
    //   with: {
    //     items: {
    //       with: {
    //         orderItemModifiers: true
    //       }
    //     }
    //   }
    // });

    // Filtrar órdenes que realmente usan este producto
    // const ordersToUpdate = affectedOrders.filter(order =>
    //   order.items.some(item => item.product_id === productId)
    // );
    const ordersToUpdate = [] as never[];

    if (ordersToUpdate.length === 0) {
      return NextResponse.json({
        message: "No orders need recalculation",
        affected_orders: 0,
      });
    }

    // Procesar en lotes de 50 para evitar timeouts
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < ordersToUpdate.length; i += BATCH_SIZE) {
      batches.push(ordersToUpdate.slice(i, i + BATCH_SIZE));
    }

    let totalUpdated = 0;

    // Procesar cada lote
    for (const batch of batches) {
      const updatePromises = batch.map(async (order) => {
        // Recalcular expected_weight para esta orden
        // for (const item of order.items) {
        //   // Obtener producto actualizado
        //   const productData = await db.query.products.findFirst({
        //     where: eq(products.id, item.product_id)
        //   });
        //   if (productData) {
        //     expectedWeight += productData.weight * item.quantity;
        //     // Calcular peso de modificadores
        //     for (const modifier of item.orderItemModifiers) {
        //       const modifierData = await db.query.modifiers.findFirst({
        //         where: eq(modifiers.id, modifier.modifier_id)
        //       });
        //       if (modifierData) {
        //         expectedWeight += modifierData.weight * item.quantity;
        //       }
        //     }
        //   }
        // }
        // Actualizar expected_weight de la orden
        // await db
        //   .update(orders)
        //   .set({
        //     expected_weight: expectedWeight,
        //     updated_at: new Date(),
        //   })
        //   .where(eq(orders.id, order.id));
        // return order.id;
      });

      const updatedOrderIds = await Promise.all(updatePromises);
      totalUpdated += updatedOrderIds.length;
    }

    return NextResponse.json({
      message: "Expected weights recalculated successfully",
      affected_orders: totalUpdated,
      batches_processed: batches.length,
    });
  } catch (error) {
    console.error("Error recalculating expected weights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
