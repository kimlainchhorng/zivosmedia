/**
 * Results Breadcrumbs Component
 * Visual breadcrumb navigation with JSON-LD BreadcrumbList schema
 * for SEO-friendly results pages
 */

import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import BreadcrumbSchema, { type BreadcrumbItem as SchemaItem } from "@/components/seo/BreadcrumbSchema";
import { cn } from "@/lib/utils";

export type ResultsServiceType = "flights" | "hotels" | "cars";

interface ResultsBreadcrumbsProps {
  service: ResultsServiceType;
  className?: string;
}

const serviceConfig = {
  flights: {
    label: "Flights",
    href: "/flights",
  },
  hotels: {
    label: "Hotels",
    href: "/hotels",
  },
  cars: {
    label: "Car Rental",
    href: "/rent-car",
  },
};

export function ResultsBreadcrumbs({ service, className }: ResultsBreadcrumbsProps) {
  const config = serviceConfig[service];

  // Build schema items for JSON-LD
  const schemaItems: SchemaItem[] = [
    { name: "Home", url: "/" },
    { name: config.label, url: config.href },
    { name: "Results", url: `${config.href}/results` },
  ];

  return (
    <>
      {/* JSON-LD Breadcrumb Schema */}
      <BreadcrumbSchema items={schemaItems} />

      {/* Visual Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className={cn("py-3 border-b border-border/30 bg-background/50", className)}
      >
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to={config.href}
                    className="text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    {config.label}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-medium">
                  Results
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </nav>
    </>
  );
}

export default ResultsBreadcrumbs;
