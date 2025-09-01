"use client";

import { OrganizationList } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Switcher() {
  const theme = useTheme();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl") ?? "/";

  return (
    <OrganizationList
      appearance={{
        baseTheme: theme.resolvedTheme === "dark" ? dark : undefined,
      }}
      hidePersonal={true}
      afterCreateOrganizationUrl={redirectUrl}
      afterSelectOrganizationUrl={redirectUrl}
    />
  );
}

export default function OrgSelectionPage() {
  return (
    <Suspense>
      <Switcher />
    </Suspense>
  );
}
