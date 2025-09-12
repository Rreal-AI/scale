import { NextRequest } from "next/server";
import * as workflow from "@/lib/workflow";
import { eq } from "drizzle-orm";
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

  const inboundOrderEmailInboxId = recipient.split("@")[0];

  const org = await db.query.organizations.findFirst({
    where: eq(
      organizations.inbound_order_email_inbox_id,
      inboundOrderEmailInboxId
    ),
  });

  if (!org) {
    logger.error(`Organization not found: ${inboundOrderEmailInboxId}`, {
      inboundOrderEmailInboxId,
    });
    return new Response("Organization not found", { status: 200 });
  }

  await workflow.dispatch("ProcessOrder", {
    input: text,
    org_id: org.id,
  });

  return new Response("OK");
}
