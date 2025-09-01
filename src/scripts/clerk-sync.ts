import "dotenv/config";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function sync() {
  const clerkOrganizations = await clerk.organizations.getOrganizationList({
    limit: 100,
  });

  await db
    .insert(organizations)
    .values(
      clerkOrganizations.data.map((organization) => ({
        id: organization.id,
        name: organization.name,
      }))
    )
    .onConflictDoNothing();
}

sync();
