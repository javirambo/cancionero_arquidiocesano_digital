"use client";

import { useEffect } from "react";
import { useHomeTitle } from "@/app/components/home-title-context";
import type { HeaderBrand } from "@/app/components/home-title-context";

// Setea el branding de parroquia en el header superior mientras esta
// vista está montada, y lo limpia al salir para que el resto del sitio
// vuelva a mostrar los logos institucionales.
export function ParishHeaderBranding({ brand }: { brand: HeaderBrand }) {
  const { setBrand } = useHomeTitle();
  useEffect(() => {
    setBrand(brand);
    return () => setBrand(null);
  }, [setBrand, brand.name, brand.logoUrl, brand.href]);
  return null;
}
