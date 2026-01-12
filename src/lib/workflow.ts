import { getBaseUrl } from "@/lib/utils";
import { Client, TriggerOptions } from "@upstash/workflow";
import { z } from "zod";
import { logger } from "./logger";

let workflowClient: Client | null;

export function getWorkflowClient() {
  if (workflowClient) {
    return workflowClient;
  }

  if (!process.env.QSTASH_TOKEN) {
    throw new Error("QSTASH_TOKEN is not set");
  }

  workflowClient = new Client({ token: process.env.QSTASH_TOKEN });

  return workflowClient;
}

function getWorkflowRoute(workflow: string) {
  return `${getBaseUrl()}/api/workflow/${workflow}`;
}

export const Workflow = {
  ProcessOrder: getWorkflowRoute("process-order"),
  VerifyVisual: getWorkflowRoute("verify-visual"),
} as const;

export const WorkflowPayload = {
  ProcessOrder: z.object({
    input: z.string(),
    org_id: z.string(),
  }),
  VerifyVisual: z.object({
    orderId: z.string(),
    orgId: z.string(),
    images: z.array(z.string()), // base64 encoded images
  }),
} satisfies Record<keyof typeof Workflow, z.ZodType>;

export type WorkflowPayload<T extends keyof typeof Workflow> = z.infer<
  (typeof WorkflowPayload)[T]
>;

export function dispatch<T extends keyof typeof Workflow>(
  workflow: T,
  payload: WorkflowPayload<T>,
  options?: { flowControl?: TriggerOptions["flowControl"] }
) {
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_TUNNEL_URL
  ) {
    logger.info("Dispatching workflow", { workflow, payload });
    return;
  }

  return getWorkflowClient().trigger({
    ...options,
    url: Workflow[workflow],
    body: payload,
  });
}
