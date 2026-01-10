import { auth } from "@clerk/nextjs/server";
import { WeightSettingsContent } from "@/components/settings/weight-settings-content";

export default async function WeightSettingsPage() {
  await auth.protect();

  return <WeightSettingsContent />;
}
