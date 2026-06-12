import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./_common/app-sidebar";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["ideas"],
    queryFn: async () => {
      const res = await fetch("/api/ideas");
      if (!res.ok) throw new Error("Failed to fetch ideas");
      return res.json();
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
  });

  return (
    <SidebarProvider>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AppSidebar />
        <SidebarInset className="bg-sidebar! border-none">
          <div
            className="m-1 px-4 rounded-lg border border-border
             dark:border-[#e0e1e11a] shadow-xs bg-background h-full
            "
          >
            <div className="py-2 px-3">{children}</div>
          </div>
        </SidebarInset>
      </HydrationBoundary>
    </SidebarProvider>
  );
}
