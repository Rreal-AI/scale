import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rules } from "@/db/schema";
import { getRulesParamsSchema } from "@/schemas/rules";
import { auth } from "@clerk/nextjs/server";
import { desc, asc, and, eq, ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = getRulesParamsSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || undefined,
      sort_by: searchParams.get("sort_by") || "priority",
      sort_order: searchParams.get("sort_order") || "asc",
      is_active: searchParams.get("is_active") || undefined,
    });

    const { page, limit, search, sort_by, sort_order, is_active } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(rules.org_id, orgId)];

    if (search) {
      whereConditions.push(
        or(
          ilike(rules.name, `%${search}%`),
          ilike(rules.description, `%${search}%`)
        )!
      );
    }

    if (is_active !== undefined) {
      whereConditions.push(eq(rules.is_active, is_active));
    }

    // Build order by
    const orderColumn = rules[sort_by];
    const orderDirection = sort_order === "asc" ? asc : desc;

    // Get rules with pagination
    const rulesData = await db
      .select()
      .from(rules)
      .where(and(...whereConditions))
      .orderBy(orderDirection(orderColumn))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: rules.id })
      .from(rules)
      .where(and(...whereConditions));

    return NextResponse.json({
      rules: rulesData,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, conditions, actions, is_active, priority } = body;

    // Validate required fields
    if (!name || !conditions || !actions) {
      return NextResponse.json(
        { error: "Name, conditions, and actions are required" },
        { status: 400 }
      );
    }

    if (conditions.length === 0) {
      return NextResponse.json(
        { error: "At least one condition is required" },
        { status: 400 }
      );
    }

    if (actions.length === 0) {
      return NextResponse.json(
        { error: "At least one action is required" },
        { status: 400 }
      );
    }

    // Create rule
    const newRule = await db
      .insert(rules)
      .values({
        org_id: orgId,
        name,
        description,
        conditions,
        actions,
        is_active: is_active ?? true,
        priority: priority ?? 0,
      })
      .returning();

    return NextResponse.json(newRule[0], { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}