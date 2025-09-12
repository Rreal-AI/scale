import { NextRequest } from "next/server";
import * as workflow from "@/lib/workflow";
import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { logger } from "@/lib/logger";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const body = await request.formData();

  const recipient = body.get("recipient")?.toString() ?? "";
  const text = body.get("body-plain")?.toString() ?? "";

  logger.info(`Received webhook from Mailgun: ${recipient}`, {
    recipient,
    text,
  });

  const orgId = recipient.split("@")[0];

  const org = await db.query.organizations.findFirst({
    where: ilike(organizations.id, orgId),
  });

  if (!org) {
    logger.error(`Organization not found: ${orgId}`, { orgId });
    return new Response("Organization not found", { status: 200 });
  }

  await workflow.dispatch("ProcessOrder", {
    input: text,
    org_id: orgId,
  });

  return new Response("OK");
}
