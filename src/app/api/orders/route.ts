import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders, orderEvents } from "@/db/schema";
import { and, eq, ilike, or, asc, desc, count, inArray, gte, lte } from "drizzle-orm";
import { z } from "zod";

// GET /api/orders - Listar orders con paginación y filtros
export async function GET(request: NextRequest) {
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

    // Parsear parámetros de query con valores por defecto
    const searchParams = request.nextUrl.searchParams;

    // Aplicar valores por defecto directamente
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
    );
    const search = searchParams.get("search") || undefined;
    const status =
      (searchParams.get("status") as
        | "pending_weight"
        | "weighed"
        | "completed"
        | "cancelled"
        | "archived") || undefined;
    const type =
      (searchParams.get("type") as "delivery" | "takeout") || undefined;
    const archived_from = searchParams.get("archived_from") || undefined;
    const archived_to = searchParams.get("archived_to") || undefined;
    const sort_by =
      (searchParams.get("sort_by") as
        | "created_at"
        | "updated_at"
        | "customer_name"
        | "check_number"
        | "total_amount"
        | "status"
        | "type") || "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    // Validar que sort_by y sort_order sean valores válidos
    const validSortBy = [
      "created_at",
      "updated_at",
      "customer_name",
      "check_number",
      "total_amount",
      "status",
      "type",
    ];
    const validSortOrder = ["asc", "desc"];
    const validStatus = ["pending_weight", "weighed", "completed", "cancelled", "archived"];
    const validType = ["delivery", "takeout"];

    const finalSortBy = validSortBy.includes(sort_by) ? sort_by : "created_at";
    const finalSortOrder = validSortOrder.includes(sort_order)
      ? sort_order
      : "desc";
    const finalStatus =
      status && validStatus.includes(status) ? status : undefined;
    const finalType = type && validType.includes(type) ? type : undefined;

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    const conditions = [eq(orders.org_id, orgId)];

    if (search) {
      conditions.push(
        or(
          ilike(orders.customer_name, `%${search}%`),
          ilike(orders.check_number, `%${search}%`),
          ilike(orders.customer_email, `%${search}%`)
        )!
      );
    }

    if (finalStatus) {
      conditions.push(eq(orders.status, finalStatus));
    }

    if (finalType) {
      conditions.push(eq(orders.type, finalType));
    }

    // Archived date filtering
    if (archived_from) {
      try {
        const fromDate = new Date(archived_from);
        conditions.push(gte(orders.archived_at, fromDate));
      } catch (e) {
        console.error("Invalid archived_from date:", e);
      }
    }

    if (archived_to) {
      try {
        const toDate = new Date(archived_to);
        // Add one day to include the entire day
        toDate.setDate(toDate.getDate() + 1);
        conditions.push(lte(orders.archived_at, toDate));
      } catch (e) {
        console.error("Invalid archived_to date:", e);
      }
    }

    // Construir orden
    let orderColumn;
    switch (finalSortBy) {
      case "customer_name":
        orderColumn = orders.customer_name;
        break;
      case "check_number":
        orderColumn = orders.check_number;
        break;
      case "total_amount":
        orderColumn = orders.total_amount;
        break;
      case "status":
        orderColumn = orders.status;
        break;
      case "type":
        orderColumn = orders.type;
        break;
      case "updated_at":
        orderColumn = orders.updated_at;
        break;
      case "created_at":
      default:
        orderColumn = orders.created_at;
        break;
    }
    const orderDirection = finalSortOrder === "asc" ? asc : desc;

    // Ejecutar consultas en paralelo
    const [ordersList, totalCountResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(orders)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);
    const has_next_page = page < total_pages;
    const has_previous_page = page > 1;

    return NextResponse.json({
      orders: ordersList,
      pagination: {
        page,
        limit,
        total_count,
        total_pages,
        has_next_page,
        has_previous_page,
      },
      filters: {
        search,
        status: finalStatus,
        type: finalType,
        sort_by: finalSortBy,
        sort_order: finalSortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/orders - batch complete weighed orders
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schema = z.object({ ids: z.array(z.string().uuid()).min(1) });
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { ids } = parsed.data;
    const now = new Date();

    // Get current status before update
    const currentOrders = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.org_id, orgId), inArray(orders.id, ids)));

    const updated = await db
      .update(orders)
      .set({ status: "completed", updated_at: now })
      .where(and(eq(orders.org_id, orgId), inArray(orders.id, ids)))
      .returning();

    // Create audit events for status changes
    if (updated.length > 0) {
      await db.insert(orderEvents).values(
        updated.map((order) => {
          const previousOrder = currentOrders.find((o) => o.id === order.id);
          return {
            order_id: order.id,
            org_id: orgId,
            event_type: "status_changed" as const,
            event_data: {
              from_status: previousOrder?.status || "unknown",
              to_status: "completed",
            },
            actor_id: userId,
          };
        })
      );
    }

    return NextResponse.json({ updated, count: updated.length });
  } catch (error) {
    console.error("Error in batch complete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
