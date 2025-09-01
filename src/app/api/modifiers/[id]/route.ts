import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { modifiers } from "@/db/schema";
import { updateModifierSchema } from "@/schemas/modifiers";
import { and, eq } from "drizzle-orm";

// GET /api/modifiers/[id] - Obtener un modifier específico
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
        { error: "Invalid modifier ID format" },
        { status: 400 }
      );
    }

    // Buscar el modifier
    const modifier = await db
      .select()
      .from(modifiers)
      .where(and(eq(modifiers.id, id), eq(modifiers.org_id, orgId)))
      .limit(1);

    if (modifier.length === 0) {
      return NextResponse.json(
        { error: "Modifier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ modifier: modifier[0] });
  } catch (error) {
    console.error("Error fetching modifier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/modifiers/[id] - Actualizar un modifier
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
        { error: "Invalid modifier ID format" },
        { status: 400 }
      );
    }

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = updateModifierSchema.safeParse(body);

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

    // Verificar que el modifier existe y pertenece a la organización
    const existingModifier = await db
      .select()
      .from(modifiers)
      .where(and(eq(modifiers.id, id), eq(modifiers.org_id, orgId)))
      .limit(1);

    if (existingModifier.length === 0) {
      return NextResponse.json(
        { error: "Modifier not found" },
        { status: 404 }
      );
    }

    // Actualizar el modifier
    const updatedModifier = await db
      .update(modifiers)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(modifiers.id, id), eq(modifiers.org_id, orgId)))
      .returning();

    return NextResponse.json({
      modifier: updatedModifier[0],
      message: "Modifier actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating modifier:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/modifiers/[id] - Eliminar un modifier
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
        { error: "Invalid modifier ID format" },
        { status: 400 }
      );
    }

    // Verificar que el modifier existe y pertenece a la organización
    const existingModifier = await db
      .select()
      .from(modifiers)
      .where(and(eq(modifiers.id, id), eq(modifiers.org_id, orgId)))
      .limit(1);

    if (existingModifier.length === 0) {
      return NextResponse.json(
        { error: "Modifier not found" },
        { status: 404 }
      );
    }

    // Eliminar el modifier
    await db
      .delete(modifiers)
      .where(and(eq(modifiers.id, id), eq(modifiers.org_id, orgId)));

    return NextResponse.json({
      message: "Modifier eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting modifier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
