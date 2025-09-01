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

  await workflow.dispatch("ProcessOrder", {
    input: text,
    org_id: "org_2yopRjqKgwchgLNHKPlT2zI48Mk",
  });

  return new Response("OK");
}
