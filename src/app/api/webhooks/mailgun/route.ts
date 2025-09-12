import { NextRequest } from "next/server";
import * as workflow from "@/lib/workflow";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const body = await request.formData();

  const recipient = body.get("recipient")?.toString() ?? "";
  const text = body.get("body-plain")?.toString() ?? "";

  const orgId = recipient.split("@")[0];

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    return new Response("Organization not found", { status: 200 });
  }

  await workflow.dispatch("ProcessOrder", {
    input: text,
    org_id: orgId,
  });

  return new Response("OK");
}
