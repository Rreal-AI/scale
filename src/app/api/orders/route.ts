import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq, ilike, or, asc, desc, count } from "drizzle-orm";

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
        | "cancelled") || undefined;
    const type =
      (searchParams.get("type") as "delivery" | "takeout") || undefined;
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
    const validStatus = ["pending_weight", "weighed", "completed", "cancelled"];
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
