import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LayoutDashboard, Package } from "lucide-react";
import { AdminShell } from "./AdminShell";
import type { NavConfig } from "./nav/types";

const testNav: NavConfig = {
  sections: [
    {
      label: "Operations",
      items: [
        { title: "Dashboard", url: "/test/dashboard", icon: LayoutDashboard },
        { title: "Orders", url: "/test/orders", icon: Package },
      ],
    },
  ],
};

function renderShell(initialPath = "/test/dashboard") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AdminShell vertical="restaurant" nav={testNav} title="Test Shell">
          <div data-testid="page-content">Hello content</div>
        </AdminShell>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("AdminShell", () => {
  it("renders the page content inside the shell", () => {
    renderShell();
    expect(screen.getByTestId("page-content")).toHaveTextContent("Hello content");
  });

  it("renders all nav items from the config", () => {
    renderShell();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("renders the section label", () => {
    renderShell();
    expect(screen.getByText("Operations")).toBeInTheDocument();
  });

  it("shows the vertical badge in the topbar", () => {
    renderShell();
    expect(screen.getByText("Restaurant")).toBeInTheDocument();
  });

  it("includes a sidebar trigger in the header for collapse/expand", () => {
    renderShell();
    // shadcn SidebarTrigger renders as a button labeled "Toggle Sidebar"
    expect(screen.getByLabelText(/toggle sidebar/i)).toBeInTheDocument();
  });
});
