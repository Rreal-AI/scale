import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      inbound_email: `${org.inbound_order_email_inbox_id}@orders.foodsync.ai`,
      timezone: org.timezone,
      currency: org.currency,
      order_weight_delta_tolerance: org.order_weight_delta_tolerance,
      visual_verification_prompt: org.visual_verification_prompt,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Schema for updating organization settings
const updateOrganizationSchema = z.object({
  order_weight_delta_tolerance: z
    .number()
    .int()
    .positive("Tolerance must be a positive integer")
    .optional(),
  visual_verification_prompt: z
    .string()
    .nullable()
    .optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = updateOrganizationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    // Update organization
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedOrg.id,
      name: updatedOrg.name,
      order_weight_delta_tolerance: updatedOrg.order_weight_delta_tolerance,
      visual_verification_prompt: updatedOrg.visual_verification_prompt,
      message: "Organization settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
