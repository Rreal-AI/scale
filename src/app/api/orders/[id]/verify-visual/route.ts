import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { eq, and } from "drizzle-orm";
import { dispatch } from "@/lib/workflow";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;

    const body = await request.json();
    const { images } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.org_id, orgId)),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Set status to pending immediately and record start time
    await db
      .update(orders)
      .set({
        visual_verification_status: "pending",
        visual_verification_started_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.org_id, orgId)));

    // Dispatch workflow to process in background
    await dispatch("VerifyVisual", {
      orderId,
      orgId,
      images,
    });

    // Return immediately - processing happens in background
    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Visual verification started. Check back shortly for results.",
    });
  } catch (error) {
    console.error("Visual verification error:", error);
    return NextResponse.json(
      { error: "Failed to start visual verification" },
      { status: 500 }
    );
  }
}
