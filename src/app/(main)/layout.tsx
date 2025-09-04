import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-gray-200">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="container mx-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
