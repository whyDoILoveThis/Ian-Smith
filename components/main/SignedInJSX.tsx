"use client";

import { useAuth } from "@clerk/nextjs";
import CMS from "@/components/CMS/CMS";
import { Toaster } from "@/components/ui/toaster";
import { useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  adminUserId?: string;
};

export default function SignedInJSX({ children, adminUserId }: Props) {
  const { userId } = useAuth();

  const [showMainContent, setShowMainContent] = useState(false);

  if (userId && adminUserId && userId === adminUserId) {
    return (
      <>
        <button
          onClick={() => {
            setShowMainContent(!showMainContent);
          }}
          className={`btn btn-purple mt-4 ${showMainContent && "zz-top-plus4"}`}
        >
          {!showMainContent ? "Main Content" : "CMS"}
        </button>
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
  } else return <div className="w-full max-w-[800px]">{children}</div>;
}
