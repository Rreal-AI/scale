import { generateObject } from "ai";
import { serve } from "@upstash/workflow/nextjs";
import { structuredOrderSchema } from "@/schemas/structured-order";
import { PROMPT } from "@/lib/prompt";
import { findByNormalizedProperty, normalizeText } from "@/lib/normalize";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { orderItemModifiers, orderItems } from "@/db/schema";
import { Workflow } from "@/lib/workflow";
import { eq, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface ProcessOrderPayload {
  input: string;
  org_id: string;
}

export const { POST } = serve<ProcessOrderPayload>(
  async (context) => {
    const { input, org_id } = context.requestPayload;

    const structuredOrder = await context.run("Structure order", async () => {
      try {
        logger.info("Structuring order", { input, org_id });

        const { object } = await generateObject({
          model: "openai/o3",
          schema: structuredOrderSchema,
          prompt: PROMPT.replace("{order}", input),
        });

        return object;
      } catch (error) {
        throw error;
      }
    });

    const orderId = await context.run("Create order", async () => {
      logger.info("Creating order", { structuredOrder, org_id });

      return db.transaction(async (tx) => {
        const products = await tx.query.products.findMany({
          where: (table, { eq, and, or, ilike }) =>
            and(
              eq(table.org_id, org_id),
              or(
                ...structuredOrder.items.map((item) =>
                  ilike(table.name, `%${normalizeText(item.name)}%`)
                )
              )
            ),
        });

        const modifiers = await tx.query.modifiers.findMany({
          where: (table, { eq, and, or, ilike }) =>
            and(
              eq(table.org_id, org_id),
              or(
                ...structuredOrder.items.flatMap((item) =>
                  item.modifiers.map((modifier) =>
                    ilike(table.name, `%${normalizeText(modifier.name)}%`)
                  )
                )
              )
            ),
        });

        // Calculate expected weight before creating the order (in grams)
        let expectedWeight = 0;

        // Calculate weight from products
        for (const item of structuredOrder.items) {
          const product = findByNormalizedProperty(products, "name", item.name);

          if (!product) {
            throw new Error(`Product not found: ${item.name}`);
          }

          expectedWeight += product.weight * item.quantity;

          // Calculate weight from modifiers for this item
          for (const modifier of item.modifiers) {
            const productModifier = findByNormalizedProperty(
              modifiers,
              "name",
              modifier.name
            );

            if (!productModifier) {
              console.log("Product modifier not found", modifier.name);
              throw new Error(`Product modifier not found: ${modifier.name}`);
            }

            expectedWeight += productModifier.weight * item.quantity;
          }
        }

        // Create order with expected_weight included
        const [newOrder] = await tx
          .insert(orders)
          .values({
            org_id,

            status: "pending_weight",
            type: structuredOrder.type,

            check_number: structuredOrder.check_number,

            customer_name: structuredOrder.customer.name,
            customer_email: structuredOrder.customer.email,
            customer_phone: structuredOrder.customer.phone,
            customer_address: structuredOrder.customer.address,

            subtotal_amount: Math.round(structuredOrder.subtotal_amount * 100),
            tax_amount: Math.round(structuredOrder.tax_amount * 100),
            total_amount: Math.round(structuredOrder.total_amount * 100),

            expected_weight: expectedWeight, // Include expected weight in create

            input,
            structured_output: structuredOrder,
          })
          .returning();

        if (!newOrder) {
          throw new Error("Failed to create order");
        }

        const newOrderItems = await tx
          .insert(orderItems)
          .values(
            structuredOrder.items.map((item) => {
              const product = findByNormalizedProperty(
                products,
                "name",
                item.name
              );

              if (!product) {
                throw new Error("Product not found");
              }

              return {
                order_id: newOrder.id,
                name: item.name,
                quantity: item.quantity,
                total_price: Math.round(item.price * 100),
                product_id: product.id,
              };
            })
          )
          .returning();

        if (!newOrderItems || newOrderItems.length === 0) {
          throw new Error("Failed to create order items");
        }

        const hasModifiers = structuredOrder.items.some(
          (item) => item.modifiers.length > 0
        );

        if (hasModifiers) {
          await tx.insert(orderItemModifiers).values(
            structuredOrder.items.flatMap((item) => {
              const orderItem = findByNormalizedProperty(
                newOrderItems,
                "name",
                item.name
              );

              if (!orderItem) {
                throw new Error("Order item not found");
              }
              return item.modifiers.map((modifier) => {
                const productModifier = findByNormalizedProperty(
                  modifiers,
                  "name",
                  modifier.name
                );

                if (!productModifier) {
                  console.log("Product modifier not found", modifier.name);
                  throw new Error("Product modifier not found");
                }

                return {
                  order_item_id: orderItem.id,
                  name: modifier.name,
                  total_price: Math.round(modifier.price * 100),
                  modifier_id: productModifier.id,
                };
              });
            })
          );
        }

        return newOrder.id;
      });
    });

    logger.info("Order created", { orderId, org_id });

    return orderId;
  },
  {
    url: Workflow.ProcessOrder,
  }
);
