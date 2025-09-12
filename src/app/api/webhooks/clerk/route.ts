import { db } from "@/db";
import { organizations } from "@/db/schema";
import { logger } from "@/lib/logger";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    logger.info("Received webhook from Clerk");

    const evt = await verifyWebhook(req);

    if (evt.type === "organization.created") {
      logger.info("Creating organization in database");
      const { id, name } = evt.data;

      if (!id || !name) {
        return new Response("Organization has missing fields", { status: 200 });
      }

      await db.insert(organizations).values({
        id,
        name,
      });
    }

    if (evt.type === "organization.updated") {
      logger.info("Updating organization in database");
      const { id, name } = evt.data;

      if (!id || !name) {
        return new Response("Organization has missing fields", { status: 200 });
      }

      await db
        .update(organizations)
        .set({ name })
        .where(eq(organizations.id, id));
    }

    if (evt.type === "organization.deleted") {
      logger.info("Deleting organization from database");
      const { id } = evt.data;

      if (!id) {
        return new Response("Organization has missing fields", { status: 200 });
      }

      await db.delete(organizations).where(eq(organizations.id, id));
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error(err);
    logger.error("Error verifying webhook", { error: err });
    return new Response("Error verifying webhook", { status: 400 });
  }
}
