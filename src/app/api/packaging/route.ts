import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { packaging } from "@/db/schema";
import { createPackagingSchema } from "@/schemas/packaging";
import { and, eq, ilike, or, asc, desc, count } from "drizzle-orm";

// GET /api/packaging - Listar packaging con paginación y filtros
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
    const sort_by =
      (searchParams.get("sort_by") as "name" | "weight" | "created_at") ||
      "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    // Validar que sort_by y sort_order sean valores válidos
    const validSortBy = ["name", "weight", "created_at"];
    const validSortOrder = ["asc", "desc"];

    const finalSortBy = validSortBy.includes(sort_by) ? sort_by : "created_at";
    const finalSortOrder = validSortOrder.includes(sort_order)
      ? sort_order
      : "desc";

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    const conditions = [eq(packaging.org_id, orgId)];

    if (search) {
      conditions.push(or(ilike(packaging.name, `%${search}%`))!);
    }

    // Construir orden
    let orderColumn;
    switch (finalSortBy) {
      case "name":
        orderColumn = packaging.name;
        break;
      case "weight":
        orderColumn = packaging.weight;
        break;
      case "created_at":
      default:
        orderColumn = packaging.created_at;
        break;
    }
    const orderDirection = finalSortOrder === "asc" ? asc : desc;

    // Ejecutar consultas en paralelo
    const [packagingList, totalCountResult] = await Promise.all([
      db
        .select()
        .from(packaging)
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(packaging)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);
    const has_next_page = page < total_pages;
    const has_previous_page = page > 1;

    return NextResponse.json({
      packaging: packagingList,
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
        sort_by: finalSortBy,
        sort_order: finalSortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching packaging:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/packaging - Crear un nuevo packaging
export async function POST(request: NextRequest) {
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

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = createPackagingSchema.safeParse(body);

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

    const validatedData = parseResult.data;

    // If setting as default, first unset all others in this org
    if (validatedData.is_default === true) {
      await db
        .update(packaging)
        .set({ is_default: false, updated_at: new Date() })
        .where(eq(packaging.org_id, orgId));
    }

    // Crear el packaging
    const newPackaging = await db
      .insert(packaging)
      .values({
        ...validatedData,
        org_id: orgId,
      })
      .returning();

    return NextResponse.json(
      { packaging: newPackaging[0], message: "Packaging creado exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating packaging:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
