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

export const metadata = {
  title: "IconCreator — Logo Background Remover & Icon Generator",
  description:
    "Remove backgrounds from logos and generate multi-size ICO files. 100% client-side, fast, and private.",
};

export default function IconCreatorPage() {
  return (
    <>
      <Nav />
      <IconCreatorApp />
      <Footer />
    </>
  );
}
