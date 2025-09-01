import { db } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organization = await db.query.organizations.findFirst({
    where: (table, { eq }) => eq(table.id, orgId),
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(organization);
}
