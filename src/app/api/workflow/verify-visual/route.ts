import { generateObject } from "ai";
import { serve } from "@upstash/workflow/nextjs";
import { visualVerificationResultSchema } from "@/schemas/visual-verification";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { orderEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Workflow } from "@/lib/workflow";
import { logger } from "@/lib/logger";

const VISUAL_VERIFICATION_PROMPT = `You are an AI assistant specialized in verifying food orders by analyzing photos.

Your task is to examine these photos of a prepared food order and verify that all expected items are present.

EXPECTED ORDER ITEMS:
{items}

IMPORTANT - PROMOTIONS AND COMBOS:
The items listed above may be PROMOTIONS or COMBOS, not individual items. Each promotion can contain MULTIPLE physical items. For example:
- "2x Tacos al Pastor" might be a promotion where EACH unit includes 3 physical tacos
- So "2x Tacos al Pastor" = 6 physical tacos in the image
- A "Combo Familiar" might include multiple dishes bundled together
- Always consider that the quantity shown (e.g., "2x") refers to promotion units, not individual food pieces

When verifying, count the PHYSICAL items and compare against what the promotion typically contains.

ANALYSIS INSTRUCTIONS:
1. Scan all the provided images systematically
2. For each expected item:
   - Look for the correct type of food (taco, burrito, side, drink, etc.)
   - Consider that the listed quantity may refer to promotion units, each containing multiple physical items
   - Note if modifiers are visible when possible (extra cheese, no onion, etc.)

3. Consider:
   - Items may be in containers, bags, or wrapped
   - Some items might be partially hidden
   - Similar items might look alike (different taco types)
   - Items may be split across multiple images
   - Promotions typically contain MORE physical items than the quantity number suggests

4. Be CONSERVATIVE in your assessment:
   - If you cannot clearly identify an item, mark it as NOT found
   - Only mark items as found if you are reasonably confident
   - When in doubt, err on the side of caution

5. Note any items visible that are NOT in the expected order (potential extras)

6. WRONG ORDER DETECTION - CRITICAL:
   Set wrong_order to TRUE if the photo appears to be from a DIFFERENT ORDER entirely.

   This is NOT about missing modifiers or slight variations - it's about the CORE ITEMS being wrong.

   Signs of wrong order:
   - The main food items in the photo are fundamentally different from what was ordered
   - Example: Order says "2x Burrito" but you see tacos, quesadillas, or nachos
   - Example: Order says "3x Tacos al Pastor" but you see burritos and enchiladas
   - The photo shows food from the same restaurant/cuisine but clearly NOT the items ordered

   When to mark wrong_order = TRUE:
   - Less than 30% of the MAIN items match (not counting sides/drinks)
   - The primary food types don't match (burrito vs taco vs quesadilla vs bowl)
   - You can clearly see this is a different customer's order

   When to mark wrong_order = FALSE:
   - Items match but quantities might be off
   - Items match but modifiers might be different
   - Some items are missing but the ones present DO match the order

Provide your analysis with confidence scores for each item and overall assessment.`;

interface VerifyVisualPayload {
  orderId: string;
  orgId: string;
  images: string[];
}

export const { POST } = serve<VerifyVisualPayload>(
  async (context) => {
    const { orderId, orgId, images } = context.requestPayload;

    logger.info("Starting visual verification workflow", { orderId, orgId });

    // Get order and items
    const order = await context.run("Get order", async () => {
      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.org_id, orgId)),
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      return order;
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

        const prompt = VISUAL_VERIFICATION_PROMPT.replace("{items}", itemsList);

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
