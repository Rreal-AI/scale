"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useRealTimeOrders } from "@/hooks/use-orders";

export function HeaderContent() {
  const pathname = usePathname();
  
  // Get page info based on pathname
  const getPageInfo = () => {
    switch (pathname) {
      case "/":
        return {
          title: "Orders Dashboard",
          subtitle: "Real-time order management and weight verification",
          showUrgentBadge: true
        };
      case "/products":
        return {
          title: "Products",
          subtitle: "Manage your product catalog and inventory"
        };
      case "/categories":
        return {
          title: "Categories", 
          subtitle: "Organize your products into categories"
        };
      case "/modifiers":
        return {
          title: "Modifiers",
          subtitle: "Manage product modifiers and add-ons"
        };
      case "/rules":
        return {
          title: "Rules",
          subtitle: "Configure automated business rules and conditions"
        };
      case "/packaging":
        return {
          title: "Packaging",
          subtitle: "Manage packaging options and configurations"
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Manage your business operations"
        };
    }
  };

  const pageInfo = getPageInfo();
  
  // Get urgent orders count only for Orders Dashboard
  const shouldFetchOrders = pageInfo.showUrgentBadge;
  const { data } = useRealTimeOrders({});
  
  const urgentOrdersCount = shouldFetchOrders && data?.orders ? 
    data.orders.filter(order => {
      if (order.status !== "pending_weight") return false;
      
      const created = new Date(order.created_at);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
      return diffMinutes >= 35;
    }).length : 0;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{pageInfo.title}</h1>
        {pageInfo.showUrgentBadge && urgentOrdersCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {urgentOrdersCount} Urgent
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {pageInfo.subtitle}
      </p>
    </div>
  );
}