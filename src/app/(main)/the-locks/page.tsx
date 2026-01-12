import { TheLocksView } from "@/components/the-locks/the-locks-view";
import { auth } from "@clerk/nextjs/server";

export default async function TheLocksPage() {
  await auth.protect();

  return <TheLocksView />;
}
