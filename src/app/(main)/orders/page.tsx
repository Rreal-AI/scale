import { auth } from "@clerk/nextjs/server";
import { WeighOrderViewWrapper } from "@/components/orders/weigh-order-view-wrapper";

export default async function OrdersPage() {
  await auth.protect();

  return <WeighOrderViewWrapper />;
}
