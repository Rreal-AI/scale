import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { packaging } from "@/db/schema";
import { updatePackagingSchema } from "@/schemas/packaging";
import { and, eq } from "drizzle-orm";

// GET /api/packaging/[id] - Obtener un packaging específico
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
        { error: "Invalid packaging ID format" },
        { status: 400 }
      );
    }

    // Buscar el packaging
    const packagingItem = await db
      .select()
      .from(packaging)
      .where(and(eq(packaging.id, id), eq(packaging.org_id, orgId)))
      .limit(1);

    if (packagingItem.length === 0) {
      return NextResponse.json(
        { error: "Packaging not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ packaging: packagingItem[0] });
  } catch (error) {
    console.error("Error fetching packaging:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/packaging/[id] - Actualizar un packaging
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
        { error: "Invalid packaging ID format" },
        { status: 400 }
      );
    }

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = updatePackagingSchema.safeParse(body);

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

    // Verificar que el packaging existe y pertenece a la organización
    const existingPackaging = await db
      .select()
      .from(packaging)
      .where(and(eq(packaging.id, id), eq(packaging.org_id, orgId)))
      .limit(1);

    if (existingPackaging.length === 0) {
      return NextResponse.json(
        { error: "Packaging not found" },
        { status: 404 }
      );
    }

    // If setting as default, first unset all others in this org
    if (validatedData.is_default === true) {
      await db
        .update(packaging)
        .set({ is_default: false, updated_at: new Date() })
        .where(eq(packaging.org_id, orgId));
    }

    // Actualizar el packaging
    const updatedPackaging = await db
      .update(packaging)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(packaging.id, id), eq(packaging.org_id, orgId)))
      .returning();

    return NextResponse.json({
      packaging: updatedPackaging[0],
      message: "Packaging actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating packaging:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/packaging/[id] - Eliminar un packaging
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
        { error: "Invalid packaging ID format" },
        { status: 400 }
      );
    }

    // Verificar que el packaging existe y pertenece a la organización
    const existingPackaging = await db
      .select()
      .from(packaging)
      .where(and(eq(packaging.id, id), eq(packaging.org_id, orgId)))
      .limit(1);

    if (existingPackaging.length === 0) {
      return NextResponse.json(
        { error: "Packaging not found" },
        { status: 404 }
      );
    }

    // Eliminar el packaging
    await db
      .delete(packaging)
      .where(and(eq(packaging.id, id), eq(packaging.org_id, orgId)));

    return NextResponse.json({
      message: "Packaging eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting packaging:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
