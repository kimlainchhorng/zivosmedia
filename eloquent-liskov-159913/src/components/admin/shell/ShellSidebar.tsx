import { createContext, useContext, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarCtx {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}
const Ctx = createContext<SidebarCtx | undefined>(undefined);

export function useShellSidebar() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellSidebar must be used inside ShellSidebarProvider");
  return v;
}

export function ShellSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <Ctx.Provider value={{ collapsed, setCollapsed }}>{children}</Ctx.Provider>;
}

export function ShellSidebarTrigger({ className }: { className?: string }) {
  const { collapsed, setCollapsed } = useShellSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle Sidebar"
      onClick={() => setCollapsed(!collapsed)}
      className={cn("h-8 w-8", className)}
    >
      <Menu className="w-4 h-4" />
    </Button>
  );
}
