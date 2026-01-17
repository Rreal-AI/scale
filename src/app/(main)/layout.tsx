import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderContent } from "@/components/header-content";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 shrink-0 items-center justify-between px-4 border-b border-gray-200 bg-white">
          <SidebarTrigger className="p-2" />
          <span className="font-semibold text-lg">Scale</span>
          <div className="w-10" />
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-16 shrink-0 items-center gap-3 px-4 border-b border-gray-200">
          <SidebarTrigger className="-ml-1" />
          <div className="h-6 w-px bg-gray-300" />
          <HeaderContent />
        </header>
        <div className="md:container md:mx-auto p-0 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
