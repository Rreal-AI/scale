import { generateObject } from "ai";
import { serve } from "@upstash/workflow/nextjs";
import { visualVerificationResultSchema } from "@/schemas/visual-verification";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { organizations } from "@/db/schema/organizations";
import { orderEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Workflow } from "@/lib/workflow";
import { logger } from "@/lib/logger";
import { DEFAULT_VISUAL_VERIFICATION_PROMPT } from "@/lib/visual-verification-prompt";

interface VerifyVisualPayload {
  orderId: string;
  orgId: string;
  images: string[];
}

export const { POST } = serve<VerifyVisualPayload>(
  async (context) => {
    const { orderId, orgId, images } = context.requestPayload;

    logger.info("Starting visual verification workflow", { orderId, orgId });

    // Get order and organization
    const { order, org } = await context.run("Get order and org", async () => {
      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.org_id, orgId)),
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      });

      return { order, org };
    });

    // Run visual verification with Gemini
    const verificationResult = await context.run(
      "Verify with Gemini",
      async () => {
        const structuredOutput = order.structured_output as {
          items?: Array<{
            name: string;
            quantity: number;
            modifiers?: Array<{ name: string }>;
          }>;
        } | null;

        const items = structuredOutput?.items || [];

        if (items.length === 0) {
          throw new Error("Order has no items to verify");
        }

        const itemsList = items
          .map((item) => {
            const modifiersText = item.modifiers?.length
              ? ` (${item.modifiers.map((m) => m.name).join(", ")})`
              : "";
            return `- ${item.quantity}x ${item.name}${modifiersText}`;
          })
          .join("\n");

        // Use organization's custom prompt if available, otherwise use default
        const basePrompt = org?.visual_verification_prompt || DEFAULT_VISUAL_VERIFICATION_PROMPT;
        const prompt = basePrompt.replace("{items}", itemsList);

        // Build content array with text and all images
        const content: Array<
          { type: "text"; text: string } | { type: "image"; image: string }
        > = [{ type: "text", text: prompt }];

        for (const image of images) {
          const imageData = image.startsWith("data:")
            ? image
            : `data:image/jpeg;base64,${image}`;
          content.push({ type: "image", image: imageData });
        }

        const { object } = await generateObject({
          model: "google/gemini-3-flash",
          schema: visualVerificationResultSchema,
          messages: [
            {
              role: "user",
              content,
            },
          ],
        });

        return object;
      }
    );

    // Determine status
    const status: "verified" | "missing_items" | "extra_items" | "uncertain" | "wrong_image" =
      verificationResult.wrong_order
        ? "wrong_image"
        : verificationResult.match && verificationResult.confidence >= 70
          ? "verified"
          : verificationResult.missing_items.length > 0
            ? "missing_items"
            : verificationResult.extra_items.length > 0
              ? "extra_items"
              : "uncertain";

    // Update order with verification result (including images)
    await context.run("Update order", async () => {
      await db
        .update(orders)
        .set({
          visual_verification_status: status,
          visual_verification_result: {
            ...verificationResult,
            images: images, // Store the images for later viewing
          },
          visual_verified_at: new Date(),
          updated_at: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.org_id, orgId)));

      // Create audit event for visual verification
      await db.insert(orderEvents).values({
        order_id: orderId,
        org_id: orgId,
        event_type: "visual_verified",
        event_data: {
          status,
          confidence: verificationResult.confidence,
          missing_items: verificationResult.missing_items,
          extra_items: verificationResult.extra_items,
          match: verificationResult.match,
          wrong_order: verificationResult.wrong_order,
        },
        actor_id: null,
      });

      logger.info("Visual verification completed", {
        orderId,
        status,
        confidence: verificationResult.confidence,
      });
    });

    return { status, result: verificationResult };
  },
  {
    url: Workflow.VerifyVisual,
  }
);
