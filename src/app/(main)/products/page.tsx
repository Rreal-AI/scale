import { ProductsTable } from "@/components/products/products-table";
import { auth } from "@clerk/nextjs/server";

export default async function ProductsPage() {
  await auth.protect();

  return <ProductsTable />;
}
