import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useShellSidebar } from "./ShellSidebar";
import type { NavConfig } from "./nav/types";

interface AdminSidebarProps {
  nav: NavConfig;
}

export function AdminSidebar({ nav }: AdminSidebarProps) {
  const { collapsed } = useShellSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (url: string) => {
    const cleanUrl = url.split("?")[0];
    return cleanUrl === "/"
      ? currentPath === "/"
      : currentPath === cleanUrl || currentPath.startsWith(cleanUrl + "/");
  };

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border/40 bg-card/30 backdrop-blur-sm transition-all duration-200 hidden md:block",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <nav className="py-3">
        {nav.sections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5 px-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <li key={item.url}>
                    <NavLink
                      to={item.url}
                      end
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                        "hover:bg-muted/60",
                        active && "bg-muted text-primary font-medium",
                        collapsed && "justify-center",
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
