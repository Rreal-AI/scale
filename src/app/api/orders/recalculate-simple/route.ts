import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders, products, modifiers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// POST /api/orders/recalculate-simple - Recalcular expected_weight de forma simple
export async function POST(request: NextRequest) {
  // Temporarily commented out to fix build
  return NextResponse.json({ message: "Endpoint temporarily disabled" });
  
  // try {
  //   console.log("🔍 Starting recalculate-simple endpoint");
  //   
  //   const { userId, orgId } = await auth();
  //   console.log("🔍 Auth result:", { userId: !!userId, orgId: !!orgId });

  //   if (!userId || !orgId) {
  //     console.log("❌ Auth failed:", { userId, orgId });
  //     return NextResponse.json(
  //       { error: "Unauthorized - Missing userId or orgId" },
  //       { status: 401 }
  //     );
  //   }

  //   // Obtener solo las primeras 5 órdenes para probar
  //   const testOrders = await db.query.orders.findMany({
  //     where: and(
  //       eq(orders.org_id, orgId),
  //       eq(orders.status, "pending_weight")
  //     ),
  //     limit: 5,
  //     with: {
  //       items: {
  //         with: {
  //           modifiers: true
  //         }
  //       }
  //     }
  //   });

  //   if (testOrders.length === 0) {
  //     return NextResponse.json({
  //       message: "No pending orders found",
  //       affected_orders: 0
  //     });
  //   }

  //   let updated = 0;

  //   // Procesar cada orden de forma simple
  //   for (const order of testOrders) {
  //     try {
  //       let expectedWeight = 0;

  //       // Calcular peso solo de productos (sin modificadores por ahora)
  //       for (const item of order.items) {
  //         const product = await db.query.products.findFirst({
  //           where: eq(products.id, item.product_id)
  //         });

  //         if (product) {
  //           expectedWeight += product.weight * item.quantity;
  //         }
  //       }

  //       // Actualizar la orden
  //       await db
  //         .update(orders)
  //         .set({ 
  //           expected_weight: expectedWeight,
  //           updated_at: new Date()
  //         })
  //         .where(eq(orders.id, order.id));

  //       updated++;
  //     } catch (error) {
  //       console.error(`Error updating order ${order.id}:`, error);
  //       // Continuar con la siguiente orden
  //     }
  //   }

  //   return NextResponse.json({
  //     message: "Simple recalculation completed",
  //     affected_orders: updated,
  //     total_orders: testOrders.length
  //   });

  // } catch (error) {
  //   console.error("Simple recalculation error:", error);
  //   return NextResponse.json(
  //     { error: "Simple recalculation failed" },
  //     { status: 500 }
  //   );
  // }
}