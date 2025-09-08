import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { createCategorySchema } from "@/schemas/categories";
import { and, eq, ilike, or, asc, desc, count } from "drizzle-orm";

// GET /api/categories - Listar categorías con paginación y filtros
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
      (searchParams.get("sort_by") as "name" | "created_at") || "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    // Validar que sort_by y sort_order sean valores válidos
    const validSortBy = ["name", "created_at"];
    const validSortOrder = ["asc", "desc"];

    const finalSortBy = validSortBy.includes(sort_by) ? sort_by : "created_at";
    const finalSortOrder = validSortOrder.includes(sort_order)
      ? sort_order
      : "desc";

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    const conditions = [eq(categories.org_id, orgId)];

    if (search) {
      conditions.push(
        or(
          ilike(categories.name, `%${search}%`),
          ilike(categories.description, `%${search}%`)
        )!
      );
    }

    // Construir orden
    let orderColumn;
    switch (finalSortBy) {
      case "name":
        orderColumn = categories.name;
        break;
      case "created_at":
      default:
        orderColumn = categories.created_at;
        break;
    }
    const orderDirection = finalSortOrder === "asc" ? asc : desc;

    // Ejecutar consultas en paralelo
    const [categoriesList, totalCountResult] = await Promise.all([
      db
        .select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(categories)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);
    const has_next_page = page < total_pages;
    const has_previous_page = page > 1;

    return NextResponse.json({
      categories: categoriesList,
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
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Crear una nueva categoría
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
    const parseResult = createCategorySchema.safeParse(body);

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

    // Crear la categoría
    const newCategory = await db
      .insert(categories)
      .values({
        ...validatedData,
        org_id: orgId,
      })
      .returning();

    return NextResponse.json(
      { category: newCategory[0], message: "Categoría creada exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
