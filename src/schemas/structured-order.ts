import { z } from "zod";

export const structuredOrderSchema = z.object({
  type: z.enum(["delivery", "takeout"]),

  check_number: z.string(),

  customer: z.object({
    name: z.string(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    address: z.string().nullish(),
  }),

  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      modifiers: z.array(
        z.object({
          name: z.string(),
          price: z
            .number()
            .describe("If the price is not specified, set it to 0"),
        })
      ),
    })
  ),

  subtotal_amount: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
});
