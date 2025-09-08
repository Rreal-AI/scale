import { OrdersView } from "@/components/orders/orders-view";
import { auth } from "@clerk/nextjs/server";

export default async function OrdersPage() {
  await auth.protect();

  return <OrdersView />;
}
