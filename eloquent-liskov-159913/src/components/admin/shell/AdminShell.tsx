/**
 * AdminShell — unified layout for all admin/business dashboards.
 * Self-contained sidebar (no shadcn sidebar dependency).
 */
import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ShellSidebarProvider, ShellSidebarTrigger } from "./ShellSidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminContextProvider, type AdminVertical } from "./useAdminContext";
import type { NavConfig } from "./nav/types";

interface AdminShellProps {
  vertical: AdminVertical;
  nav: NavConfig;
  title?: string;
  children: ReactNode;
}

export function AdminShell({ vertical, nav, title, children }: AdminShellProps) {
  return (
    <AdminContextProvider vertical={vertical}>
      {title && (
        <Helmet>
          <title>{title}</title>
        </Helmet>
      )}
      <ShellSidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar nav={nav} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 safe-area-top px-2">
              <ShellSidebarTrigger />
              <AdminTopbar vertical={vertical} />
            </header>
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </ShellSidebarProvider>
    </AdminContextProvider>
  );
}
