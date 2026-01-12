import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { visualVerificationResultSchema } from "@/schemas/visual-verification";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { eq, and } from "drizzle-orm";

const VISUAL_VERIFICATION_PROMPT = `You are an AI assistant specialized in verifying food orders by analyzing photos.

Your task is to examine this photo of a prepared food order and verify that all expected items are present.

EXPECTED ORDER ITEMS:
{items}

ANALYSIS INSTRUCTIONS:
1. Scan the entire image systematically
2. For each expected item:
   - Look for the correct type of food (taco, burrito, side, drink, etc.)
   - Verify the quantity matches (e.g., if 2 tacos expected, count 2 tacos)
   - Note if modifiers are visible when possible (extra cheese, no onion, etc.)

3. Consider:
   - Items may be in containers, bags, or wrapped
   - Some items might be partially hidden
   - Similar items might look alike (different taco types)

4. Be CONSERVATIVE in your assessment:
   - If you cannot clearly identify an item, mark it as NOT found
   - Only mark items as found if you are reasonably confident
   - When in doubt, err on the side of caution

5. Note any items visible that are NOT in the expected order (potential extras)

Provide your analysis with confidence scores for each item and overall assessment.`;

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
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.org_id, orgId)),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const structuredOutput = order.structured_output as {
      items?: Array<{
        name: string;
        quantity: number;
        modifiers?: Array<{ name: string }>;
      }>;
    } | null;

    const items = structuredOutput?.items || [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Order has no items to verify" },
        { status: 400 }
      );
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

    // Ensure image is a proper data URL
    const imageData = image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;

    const { object } = await generateObject({
      model: "google/gemini-3-flash",
      schema: visualVerificationResultSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: imageData },
          ],
        },
      ],
    });

    const status: "verified" | "missing_items" | "extra_items" | "uncertain" =
      object.match && object.confidence >= 70
        ? "verified"
        : object.missing_items.length > 0
          ? "missing_items"
          : object.extra_items.length > 0
            ? "extra_items"
            : "uncertain";

    return NextResponse.json({
      success: true,
      result: object,
      status,
    });
  } catch (error) {
    console.error("Visual verification error:", error);
    return NextResponse.json(
      { error: "Failed to process visual verification" },
      { status: 500 }
    );
  }
}
