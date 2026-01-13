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
        <header className="hidden md:flex h-16 shrink-0 items-center gap-3 px-4 border-b border-gray-200">
          <SidebarTrigger className="-ml-1" />
          <div className="h-6 w-px bg-gray-300" />
          <HeaderContent />
        </header>
        <div className="container mx-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
