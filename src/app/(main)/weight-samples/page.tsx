import { auth } from "@clerk/nextjs/server";
import { WeightSamplesContent } from "@/components/weight-samples/weight-samples-content";

export default async function WeightSamplesPage() {
  await auth.protect();

  return <WeightSamplesContent />;
}
