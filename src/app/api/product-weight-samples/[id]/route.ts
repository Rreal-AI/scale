import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productWeightSamples } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid sample ID");

// DELETE /api/product-weight-samples/[id] - Delete a weight sample
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Validate UUID format
    const parseResult = uuidSchema.safeParse(id);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid sample ID format" },
        { status: 400 }
      );
    }

    // Check if sample exists and belongs to org
    const existingSample = await db
      .select()
      .from(productWeightSamples)
      .where(
        and(
          eq(productWeightSamples.id, id),
          eq(productWeightSamples.org_id, orgId)
        )
      )
      .limit(1);

    if (existingSample.length === 0) {
      return NextResponse.json(
        { error: "Weight sample not found" },
        { status: 404 }
      );
    }

    // Delete the sample
    await db
      .delete(productWeightSamples)
      .where(
        and(
          eq(productWeightSamples.id, id),
          eq(productWeightSamples.org_id, orgId)
        )
      );

    return NextResponse.json({
      message: "Weight sample deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting weight sample:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
