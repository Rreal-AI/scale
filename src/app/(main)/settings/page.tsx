import { auth } from "@clerk/nextjs/server";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage() {
  await auth.protect();

  return <SettingsContent />;
}
