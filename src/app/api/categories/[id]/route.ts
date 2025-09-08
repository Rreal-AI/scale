import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { updateCategorySchema } from "@/schemas/categories";
import { and, eq } from "drizzle-orm";

// GET /api/categories/[id] - Obtener una categoría específica
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
        { error: "Invalid category ID format" },
        { status: 400 }
      );
    }

    // Buscar la categoría
    const category = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.org_id, orgId)))
      .limit(1);

    if (category.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: category[0] });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Actualizar una categoría
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
        { error: "Invalid category ID format" },
        { status: 400 }
      );
    }

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = updateCategorySchema.safeParse(body);

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

    // Verificar que la categoría existe y pertenece a la organización
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.org_id, orgId)))
      .limit(1);

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Actualizar la categoría
    const updatedCategory = await db
      .update(categories)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(categories.id, id), eq(categories.org_id, orgId)))
      .returning();

    return NextResponse.json({
      category: updatedCategory[0],
      message: "Categoría actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error updating category:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Eliminar una categoría
export async function DELETE(
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
        { error: "Invalid category ID format" },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe y pertenece a la organización
    const existingCategory = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.org_id, orgId)))
      .limit(1);

    if (existingCategory.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Eliminar la categoría
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.org_id, orgId)));

    return NextResponse.json({
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
