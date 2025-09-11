import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rules } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rule = await db
      .select()
      .from(rules)
      .where(and(eq(rules.id, id), eq(rules.org_id, orgId)))
      .limit(1);

    if (rule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(rule[0]);
  } catch (error) {
    console.error("Error fetching rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch rule" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    // Update rule
    const updatedRule = await db
      .update(rules)
      .set({
        name,
        description,
        conditions,
        actions,
        is_active: is_active ?? true,
        priority: priority ?? 0,
        updated_at: new Date(),
      })
      .where(and(eq(rules.id, id), eq(rules.org_id, orgId)))
      .returning();

    if (updatedRule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(updatedRule[0]);
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deletedRule = await db
      .delete(rules)
      .where(and(eq(rules.id, id), eq(rules.org_id, orgId)))
      .returning();

    if (deletedRule.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}