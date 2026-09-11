import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ZivoBusinessRestaurantCards from "../../src/components/home/ZivoBusinessRestaurantCards";
import "../../src/index.css";

const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
      <main className="mx-auto min-h-screen max-w-5xl bg-background p-4 text-foreground sm:p-8">
        <p className="mb-5 text-xs text-muted-foreground">Isolated UI fixture · example records</p>
        <ZivoBusinessRestaurantCards />
      </main>
  </QueryClientProvider>,
);
