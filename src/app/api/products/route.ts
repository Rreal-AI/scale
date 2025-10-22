import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { createProductSchema } from "@/schemas/products";
import { and, eq, ilike, or, asc, desc, count, isNull } from "drizzle-orm";

// GET /api/products - Listar productos con paginación y filtros
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
    const category_id = searchParams.get("category_id") || undefined;
    const sort_by =
      (searchParams.get("sort_by") as
        | "name"
        | "price"
        | "weight"
        | "created_at"
        | "category") || "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    // Validar que sort_by y sort_order sean valores válidos
    const validSortBy = ["name", "price", "weight", "created_at", "category"];
    const validSortOrder = ["asc", "desc"];

    const finalSortBy = validSortBy.includes(sort_by) ? sort_by : "created_at";
    const finalSortOrder = validSortOrder.includes(sort_order)
      ? sort_order
      : "desc";

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Construir condiciones de filtro
    const conditions = [eq(products.org_id, orgId)];

    if (search) {
      conditions.push(or(ilike(products.name, `%${search}%`))!);
    }

    // Filter by category
    if (category_id) {
      if (category_id === "__none__") {
        // Filter products without category
        conditions.push(isNull(products.category_id));
      } else {
        // Filter by specific category
        conditions.push(eq(products.category_id, category_id));
      }
    }

    // Construir orden
    let orderColumn;
    switch (finalSortBy) {
      case "name":
        orderColumn = products.name;
        break;
      case "price":
        orderColumn = products.price;
        break;
      case "weight":
        orderColumn = products.weight;
        break;
      case "category":
        orderColumn = categories.name;
        break;
      case "created_at":
      default:
        orderColumn = products.created_at;
        break;
    }
    const orderDirection = finalSortOrder === "asc" ? asc : desc;

    // Ejecutar consultas en paralelo
    const [productsList, totalCountResult] = await Promise.all([
      db
        .select({
          id: products.id,
          org_id: products.org_id,
          name: products.name,
          price: products.price,
          weight: products.weight,
          category_id: products.category_id,
          created_at: products.created_at,
          updated_at: products.updated_at,
          category: {
            id: categories.id,
            name: categories.name,
            description: categories.description,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(products)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);
    const has_next_page = page < total_pages;
    const has_previous_page = page > 1;

    return NextResponse.json({
      products: productsList,
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
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/products - Crear un nuevo producto
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
    const parseResult = createProductSchema.safeParse(body);

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

    // Crear el producto
    const newProduct = await db
      .insert(products)
      .values({
        ...validatedData,
        org_id: orgId,
      })
      .returning();

    return NextResponse.json(
      { product: newProduct[0], message: "Producto creado exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
