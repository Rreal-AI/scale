import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { modifiers } from "@/db/schema";
import { and, eq, inArray, ilike, SQL } from "drizzle-orm";
import { z } from "zod";

// Schema for filters when using select_all mode
const filtersSchema = z.object({
  search: z.string().optional(),
});

// Union schema: either modifier_ids array OR select_all with optional filters
const requestSchema = z.union([
  z.object({
    modifier_ids: z.array(z.string().uuid()).min(1).max(1000),
  }),
  z.object({
    select_all: z.literal(true),
    filters: filtersSchema.optional(),
  }),
]);

// DELETE /api/modifiers/bulk - Permanently delete multiple modifiers
// Supports two modes:
// 1. { modifier_ids: string[] } - Delete specific modifiers by ID
// 2. { select_all: true, filters?: {...} } - Delete all modifiers matching filters
export async function DELETE(request: NextRequest) {
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
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    let deletedModifiers: { id: string }[];

    if ("modifier_ids" in parsed.data) {
      // Mode 1: Delete by specific IDs
      const { modifier_ids } = parsed.data;

      deletedModifiers = await db
        .delete(modifiers)
        .where(and(eq(modifiers.org_id, orgId), inArray(modifiers.id, modifier_ids)))
        .returning({ id: modifiers.id });
    } else {
      // Mode 2: Delete all matching filters (select_all mode)
      const { filters } = parsed.data;

      // Build conditions array
      const conditions: SQL[] = [eq(modifiers.org_id, orgId)];

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(ilike(modifiers.name, searchTerm));
      }

      deletedModifiers = await db
        .delete(modifiers)
        .where(and(...conditions))
        .returning({ id: modifiers.id });
    }

    return NextResponse.json({
      message: "Modifiers deleted successfully",
      deleted_count: deletedModifiers.length,
      deleted_ids: deletedModifiers.map((m) => m.id),
    });
  } catch (error) {
    console.error("Error deleting modifiers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
