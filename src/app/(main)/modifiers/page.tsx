import { ModifiersTable } from "@/components/modifiers/modifiers-table";
import { auth } from "@clerk/nextjs/server";

export default async function ModifiersPage() {
  await auth.protect();

  return <ModifiersTable />;
}
