import { NextRequest } from "next/server";
import * as workflow from "@/lib/workflow";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const body = await request.formData();

  const recipient = body.get("recipient")?.toString() ?? "";
  const text = body.get("body-plain")?.toString() ?? "";

  const orgId = recipient.split("@")[0];

  await workflow.dispatch("ProcessOrder", {
    input: text,
    org_id: orgId,
  });

  return new Response("OK");
}
