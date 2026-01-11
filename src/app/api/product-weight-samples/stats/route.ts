import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productWeightSamples, products } from "@/db/schema";
import { and, eq, count, min, max, avg, sql } from "drizzle-orm";

// GET /api/product-weight-samples/stats - Get statistics for weight samples
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
    const product_id = searchParams.get("product_id") || undefined;

    // If product_id is provided, get stats for that specific product
    if (product_id) {
      const conditions = [
        eq(productWeightSamples.org_id, orgId),
        eq(productWeightSamples.product_id, product_id),
      ];

      const stats = await db
        .select({
          product_id: productWeightSamples.product_id,
          sample_count: count(),
          min_weight: min(productWeightSamples.weight),
          max_weight: max(productWeightSamples.weight),
          avg_weight: avg(productWeightSamples.weight),
        })
        .from(productWeightSamples)
        .where(and(...conditions))
        .groupBy(productWeightSamples.product_id);

      // Get product info
      const product = await db
        .select({
          id: products.id,
          name: products.name,
          weight: products.weight,
        })
        .from(products)
        .where(and(eq(products.id, product_id), eq(products.org_id, orgId)))
        .limit(1);

      return NextResponse.json({
        product: product[0] || null,
        stats: stats[0] || {
          product_id,
          sample_count: 0,
          min_weight: null,
          max_weight: null,
          avg_weight: null,
        },
      });
    }

    // Get stats for all products with samples
    const allStats = await db
      .select({
        product_id: productWeightSamples.product_id,
        product_name: products.name,
        product_weight: products.weight,
        sample_count: count(),
        min_weight: min(productWeightSamples.weight),
        max_weight: max(productWeightSamples.weight),
        avg_weight: avg(productWeightSamples.weight),
      })
      .from(productWeightSamples)
      .leftJoin(products, eq(productWeightSamples.product_id, products.id))
      .where(eq(productWeightSamples.org_id, orgId))
      .groupBy(
        productWeightSamples.product_id,
        products.name,
        products.weight
      )
      .orderBy(sql`${count()} DESC`);

    return NextResponse.json({
      stats: allStats,
    });
  } catch (error) {
    console.error("Error fetching weight sample stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
