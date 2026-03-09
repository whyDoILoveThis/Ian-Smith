import { KwikMapsContainer } from "@/components/KwikMaps";
import Footer from "@/components/main/Footer";
import Nav from "@/components/main/Nav";
import Link from "next/link";
import PortfolioLink from "./PortfolioLink";
import { Suspense } from "react";
import ReportBug from "@/components/KwikMaps/components/ReportBug";

export default function KwikMapsPage() {
  return (
    <>
      <PortfolioLink />
      <Suspense>
        <KwikMapsContainer />
      </Suspense>
      <ReportBug />
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-3">
        Created by{" "}
        <Link
          href="/"
          className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-300 dark:decoration-blue-600 hover:text-blue-800 dark:hover:text-blue-300 hover:decoration-blue-500 transition-colors duration-200"
        >
          Ian Smith
        </Link>
      </div>
    </>
  );
}
