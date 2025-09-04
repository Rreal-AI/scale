"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Settings, FileText } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Modifiers",
    href: "/modifiers",
    icon: Settings,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">S</span>
          </div>
          {state === "expanded" && (
            <span className="text-lg font-semibold">Scale</span>
          )}
        </div>
      </SidebarHeader>

      {/* Divider line between header and content */}
      <div className="h-px bg-gray-300 mx-2" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-2">
          <div className="text-xs text-muted-foreground">v1.0.0</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
