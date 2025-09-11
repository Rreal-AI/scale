import { RulesTable } from "@/components/rules/rules-table";
import { auth } from "@clerk/nextjs/server";

export default async function RulesPage() {
  await auth.protect();

  return <RulesTable />;
}