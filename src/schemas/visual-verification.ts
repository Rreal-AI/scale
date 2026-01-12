import { z } from "zod";

export const visualVerificationResultSchema = z.object({
  match: z
    .boolean()
    .describe("True if all expected items appear to be present in the image"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall confidence score from 0 to 100"),
  identified_items: z
    .array(
      z.object({
        name: z.string().describe("Name of the item being checked"),
        found: z.boolean().describe("Whether the item was found in the image"),
        confidence: z
          .number()
          .min(0)
          .max(100)
          .describe("Confidence score for this specific item"),
      })
    )
    .describe("List of expected items and whether they were identified"),
  missing_items: z
    .array(z.string())
    .describe("Names of items that appear to be missing from the image"),
  extra_items: z
    .array(z.string())
    .describe("Names of items found in the image that were not in the order"),
  wrong_order: z
    .boolean()
    .describe("True if the image appears to be of a completely different order. This means the items visible in the photo do NOT match the expected order items - even if they are from the same restaurant or cuisine type. For example: order expects '2x Burrito' but photo shows tacos and quesadillas instead."),
  notes: z
    .string()
    .optional()
    .describe("Additional observations about the image or verification"),
  images: z
    .array(z.string())
    .optional()
    .describe("Base64 encoded images used for verification"),
});

export type VisualVerificationResult = z.infer<
  typeof visualVerificationResultSchema
>;
