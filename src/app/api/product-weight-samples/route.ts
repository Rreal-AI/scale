import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productWeightSamples, products } from "@/db/schema";
import { and, eq, asc, desc, count } from "drizzle-orm";
import { z } from "zod";

const createWeightSampleSchema = z.object({
  product_id: z.string().uuid("Invalid product ID").optional(),
  order_id: z.string().uuid("Invalid order ID").optional(),
  weight: z.number().int().positive("Weight must be positive"),
  item_count: z.number().int().positive().default(1),
  is_single_product: z.boolean().default(true),
  check_number: z.string().optional(),
  items_summary: z.string().optional(),
});

// GET /api/product-weight-samples - List weight samples with pagination
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

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

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const product_id = searchParams.get("product_id") || undefined;
    const is_single_product = searchParams.get("is_single_product");
    const sort_by =
      (searchParams.get("sort_by") as "weight" | "created_at") || "created_at";
    const sort_order =
      (searchParams.get("sort_order") as "asc" | "desc") || "desc";

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(productWeightSamples.org_id, orgId)];

    if (product_id) {
      conditions.push(eq(productWeightSamples.product_id, product_id));
    }

    if (is_single_product !== null && is_single_product !== undefined) {
      conditions.push(eq(productWeightSamples.is_single_product, is_single_product === "true"));
    }

    // Build order
    const orderColumn =
      sort_by === "weight"
        ? productWeightSamples.weight
        : productWeightSamples.created_at;
    const orderDirection = sort_order === "asc" ? asc : desc;

    // Execute queries in parallel
    const [samplesList, totalCountResult] = await Promise.all([
      db
        .select({
          id: productWeightSamples.id,
          org_id: productWeightSamples.org_id,
          product_id: productWeightSamples.product_id,
          order_id: productWeightSamples.order_id,
          weight: productWeightSamples.weight,
          item_count: productWeightSamples.item_count,
          is_single_product: productWeightSamples.is_single_product,
          check_number: productWeightSamples.check_number,
          items_summary: productWeightSamples.items_summary,
          created_at: productWeightSamples.created_at,
          updated_at: productWeightSamples.updated_at,
          product: {
            id: products.id,
            name: products.name,
            weight: products.weight,
          },
        })
        .from(productWeightSamples)
        .leftJoin(products, eq(productWeightSamples.product_id, products.id))
        .where(and(...conditions))
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(productWeightSamples)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);
    const has_next_page = page < total_pages;
    const has_previous_page = page > 1;

    return NextResponse.json({
      samples: samplesList,
      pagination: {
        page,
        limit,
        total_count,
        total_pages,
        has_next_page,
        has_previous_page,
      },
      filters: {
        product_id,
        is_single_product: is_single_product === "true" ? true : is_single_product === "false" ? false : undefined,
        sort_by,
        sort_order,
      },
    });
  } catch (error) {
    console.error("Error fetching weight samples:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/product-weight-samples - Create a new weight sample
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

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

    const body = await request.json();
    const parseResult = createWeightSampleSchema.safeParse(body);

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

    // Verify product exists and belongs to org (only if product_id is provided)
    if (validatedData.product_id) {
      const product = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, validatedData.product_id),
            eq(products.org_id, orgId)
          )
        )
        .limit(1);

      if (product.length === 0) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
    }

    // Create the weight sample
    const newSample = await db
      .insert(productWeightSamples)
      .values({
        product_id: validatedData.product_id || null,
        order_id: validatedData.order_id || null,
        weight: validatedData.weight,
        item_count: validatedData.item_count,
        is_single_product: validatedData.is_single_product,
        check_number: validatedData.check_number || null,
        items_summary: validatedData.items_summary || null,
        org_id: orgId,
      })
      .returning();

    return NextResponse.json(
      { sample: newSample[0], message: "Weight sample saved successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating weight sample:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
