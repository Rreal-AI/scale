"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Settings,
  FileText,
  Box,
  ShoppingBag,
  Tag,
  Scale,
  Cog,
  SlidersHorizontal,
} from "lucide-react";
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
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

const navigationItems = [
  {
    title: "Products",
    href: "/products",
    icon: ShoppingBag,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tag,
  },
  {
    title: "Rules",
    href: "/rules",
    icon: Scale,
  },
  {
    title: "Packaging",
    href: "/packaging",
    icon: Box,
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
  {
    title: "Weight Settings",
    href: "/weight-settings",
    icon: SlidersHorizontal,
  },
  {
    title: "Weight Samples",
    href: "/weight-samples",
    icon: Scale,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Cog,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <OrganizationSwitcher />
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
        <UserButton showName />
      </SidebarFooter>
    </Sidebar>
  );
}
