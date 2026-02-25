"use client";

import { useAuth } from "@clerk/nextjs";
import CMS from "@/components/CMS/CMS";
import { Toaster } from "@/components/ui/toaster";
import { useState, type ReactNode } from "react";
import { MainWrap } from "./MainWrap";

type Props = {
  children: ReactNode;
  adminUserId?: string;
};

export default function SignedInJSX({ children, adminUserId }: Props) {
  const { userId } = useAuth();

  const [showMainContent, setShowMainContent] = useState(true);

  if (userId && adminUserId && userId === adminUserId) {
    return (
      <>
        <div className="fixed left-0 top-24 p-4 mt-4 bg-white/10 backdrop-blur-md rounded-md border border-l-0 border-white/25 rounded-tl-none rounded-bl-none zz-top-plus4 w-fit -translate-x-[80px] hover:translate-x-0 transition-transform">
          <button
            onClick={() => {
              setShowMainContent(!showMainContent);
            }}
            className={`btn btn-purple`}
          >
            {!showMainContent ? "Main" : "CMS"}
          </button>
        </div>
        {showMainContent ? (
          <>{children}</>
        ) : (
          <>
            <CMS />
            <Toaster />
          </>
        )}
      </>
    );
  } else return <>{children}</>;
}
