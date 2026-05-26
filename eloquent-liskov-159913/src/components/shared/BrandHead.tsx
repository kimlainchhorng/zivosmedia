/**
 * BrandHead Component
 * Dynamically sets page title with brand name
 */
import { useEffect } from "react";
import { useBrand } from "@/hooks/useBrand";

interface BrandHeadProps {
  title?: string;
}

export function BrandHead({ title }: BrandHeadProps) {
  const { brand } = useBrand();

  useEffect(() => {
    document.title = title 
      ? `${title} | ${brand.name}` 
      : brand.name;
  }, [title, brand.name]);

  return null;
}

export default BrandHead;
