import { generateObject } from "ai";
import { serve } from "@upstash/workflow/nextjs";
import { structuredOrderSchema } from "@/schemas/structured-order";
import { PROMPT } from "@/lib/prompt";
import { findByNormalizedProperty, normalizeText } from "@/lib/normalize";
import { db } from "@/db";
import { orders } from "@/db/schema/orders";
import { orderItemModifiers, orderItems, modifiers as modifiersTable, orderEvents, products as productsTable } from "@/db/schema";
import { Workflow } from "@/lib/workflow";
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
          model: "google/gemini-3-flash",
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
        let products = await tx.query.products.findMany({
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

        // Auto-create products that don't exist
        const existingProductNames = new Set(
          products.map((p) => normalizeText(p.name))
        );

        const missingProducts = structuredOrder.items
          .filter((item) => !existingProductNames.has(normalizeText(item.name)));

        // Get unique missing products by normalized name
        const uniqueMissingProducts = Array.from(
          new Map(
            missingProducts.map((p) => [normalizeText(p.name), p])
          ).values()
        );

        // Create missing products with default weight of 0
        if (uniqueMissingProducts.length > 0) {
          logger.info("Auto-creating missing products", {
            products: uniqueMissingProducts.map((p) => p.name),
            org_id,
          });

          const createdProducts = await tx
            .insert(productsTable)
            .values(
              uniqueMissingProducts.map((p) => ({
                org_id,
                name: p.name,
                price: Math.round(p.price * 100 / p.quantity), // Price per unit in cents
                weight: 0, // Default weight - user can update later
              }))
            )
            .returning();

          // Add created products to the products array
          products = [...products, ...createdProducts];
        }

        let modifiers = await tx.query.modifiers.findMany({
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

        // Auto-create modifiers that don't exist
        const existingModifierNames = new Set(
          modifiers.map((m) => normalizeText(m.name))
        );

        const missingModifiers = structuredOrder.items
          .flatMap((item) => item.modifiers)
          .filter((m) => !existingModifierNames.has(normalizeText(m.name)));

        // Get unique missing modifiers by normalized name
        const uniqueMissingModifiers = Array.from(
          new Map(
            missingModifiers.map((m) => [normalizeText(m.name), m])
          ).values()
        );

        // Create missing modifiers with default weight of 0
        if (uniqueMissingModifiers.length > 0) {
          logger.info("Auto-creating missing modifiers", {
            modifiers: uniqueMissingModifiers.map((m) => m.name),
            org_id,
          });

          const createdModifiers = await tx
            .insert(modifiersTable)
            .values(
              uniqueMissingModifiers.map((m) => ({
                org_id,
                name: m.name,
                price: Math.round(m.price * 100), // Convert to cents
                weight: 0, // Default weight - user can update later
              }))
            )
            .returning();

          // Add created modifiers to the modifiers array
          modifiers = [...modifiers, ...createdModifiers];
        }

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

        // Create audit event
        await tx.insert(orderEvents).values({
          order_id: newOrder.id,
          org_id,
          event_type: "created",
          event_data: {
            check_number: structuredOrder.check_number,
            customer_name: structuredOrder.customer.name,
            items_count: structuredOrder.items.length,
            expected_weight: expectedWeight,
            order_type: structuredOrder.type,
          },
          actor_id: null,
        });

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
