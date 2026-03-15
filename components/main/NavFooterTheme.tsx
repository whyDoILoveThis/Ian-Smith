"use client";

import { createContext, useContext, type ReactNode } from "react";

export type NavFooterThemeName = "default" | "black";

const NavFooterThemeContext = createContext<NavFooterThemeName>("default");

export function NavFooterThemeProvider({
  theme,
  children,
}: {
  theme: NavFooterThemeName;
  children: ReactNode;
}) {
  return (
    <NavFooterThemeContext.Provider value={theme}>
      {children}
    </NavFooterThemeContext.Provider>
  );
}

export function useNavFooterTheme() {
  return useContext(NavFooterThemeContext);
}
