"use client";

import { usePathname } from "next/navigation";
import { PerformanceOverlay } from ".";

const EXCLUDED_ROUTES = ["/about", "/watersort"];

export default function PerformanceOverlayRouteCheckRenderer() {
  const pathname = usePathname();

  const isExcluded = EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (isExcluded) return null;

  return <PerformanceOverlay />;
}
