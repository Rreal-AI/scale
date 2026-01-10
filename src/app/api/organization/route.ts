import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
