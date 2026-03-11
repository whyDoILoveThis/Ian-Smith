import { KwikMapsContainer } from "@/components/KwikMaps";
import PortfolioLink from "./PortfolioLink";
import { Suspense } from "react";

export default function KwikMapsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950">
      <PortfolioLink />
      <div className="flex-1 min-h-0 relative">
        <Suspense>
          <KwikMapsContainer />
        </Suspense>
      </div>
    </div>
  );
}
