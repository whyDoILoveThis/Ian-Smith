"use client";

import { createPortal } from "react-dom";

export function ItsPortal0({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;

  const root = document.getElementById("portal-root-0");
  if (!root) return null;

  return createPortal(children, root);
}
