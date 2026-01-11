import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { eq, and } from "drizzle-orm";
import type { VisualVerificationResult } from "@/schemas/visual-verification";

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

Respond with a JSON object in this exact format:
{
  "match": boolean (true if all expected items appear to be present),
  "confidence": number (0-100, overall confidence score),
  "identified_items": [
    {
      "name": "item name",
      "found": boolean,
      "confidence": number (0-100)
    }
  ],
  "missing_items": ["item names that appear to be missing"],
  "extra_items": ["item names found that were not in the order"],
  "notes": "optional additional observations"
}`;

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

    // Extract base64 data from data URL if needed
    const base64Data = image.startsWith("data:")
      ? image.split(",")[1]
      : image;

    // Call Gemini API directly
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 }
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: "Failed to process image with AI" },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let result: VisualVerificationResult;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    const status: "verified" | "missing_items" | "extra_items" | "uncertain" =
      result.match && result.confidence >= 70
        ? "verified"
        : result.missing_items.length > 0
          ? "missing_items"
          : result.extra_items.length > 0
            ? "extra_items"
            : "uncertain";

    return NextResponse.json({
      success: true,
      result,
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
