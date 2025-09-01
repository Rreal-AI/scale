import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { updateProductSchema } from "@/schemas/products";
import { and, eq } from "drizzle-orm";

// GET /api/products/[id] - Obtener un producto específico
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
        { error: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // Buscar el producto
    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.org_id, orgId)))
      .limit(1);

    if (product.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: product[0] });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Actualizar un producto
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
        { error: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // Parsear y validar el body
    const body = await request.json();
    const parseResult = updateProductSchema.safeParse(body);

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

    // Verificar que el producto existe y pertenece a la organización
    const existingProduct = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.org_id, orgId)))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Actualizar el producto
    const updatedProduct = await db
      .update(products)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.org_id, orgId)))
      .returning();

    return NextResponse.json({
      product: updatedProduct[0],
      message: "Producto actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating product:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Eliminar un producto
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
        { error: "Invalid product ID format" },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y pertenece a la organización
    const existingProduct = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.org_id, orgId)))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Eliminar el producto
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.org_id, orgId)));

    return NextResponse.json({
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
