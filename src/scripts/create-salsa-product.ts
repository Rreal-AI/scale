import { db } from "@/db";
import { products } from "@/db/schema";

async function createSalsaProduct() {
  try {
    // Crear el producto "Trio de Salsas" con 6 onzas (170 gramos)
    const salsaProduct = await db
      .insert(products)
      .values({
        org_id: "org_2r8Q9K9K9K9K9K9K9K9K9K9K", // ID de organización de ejemplo - cambiar por el real
        name: "Trio de Salsas",
        price: 0, // Producto gratuito
        weight: 170, // 6 onzas en gramos
        category_id: null, // Sin categoría específica
      })
      .returning();

    console.log("✅ Producto 'Trio de Salsas' creado:", salsaProduct[0]);
  } catch (error) {
    console.error("❌ Error creando producto:", error);
  }
}

createSalsaProduct();