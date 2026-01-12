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
