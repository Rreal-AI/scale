import { CategoriesTable } from "@/components/categories/categories-table";
import { auth } from "@clerk/nextjs/server";

export default async function CategoriesPage() {
  await auth.protect();

  return <CategoriesTable />;
}
