import { PackagingTable } from "@/components/packaging/packaging-table";
import { auth } from "@clerk/nextjs/server";

export default async function PackagingPage() {
  await auth.protect();

  return <PackagingTable />;
}
