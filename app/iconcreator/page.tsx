/**
 * /iconcreator — Logo Background Remover & Icon Generator
 *
 * Client-side tool for removing backgrounds from logos
 * and generating multi-size ICO files.
 *
 * All processing happens in the browser using the Canvas API.
 */

import { IconCreatorApp } from "@/components/IconCreator/components/IconCreatorApp";
import Footer from "@/components/main/Footer";
import Nav from "@/components/main/Nav";
import { NavFooterThemeProvider } from "@/components/main/NavFooterTheme";

export const metadata = {
  title: "IconCreator — Logo Background Remover & Icon Generator",
  description:
    "Remove backgrounds from logos and generate multi-size ICO files. 100% client-side, fast, and private.",
};

export default function IconCreatorPage() {
  return (
    <NavFooterThemeProvider theme="black">
      <div className="w-full min-h-screen">
        <div className="absolute inset-0 bg-white dark:bg-black" />
        <Nav />
        <IconCreatorApp />
        <Footer />
      </div>
    </NavFooterThemeProvider>
  );
}
