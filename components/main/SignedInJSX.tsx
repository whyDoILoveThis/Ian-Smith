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

  const [showMainContent, setShowMainContent] = useState(false);

  if (userId && adminUserId && userId === adminUserId) {
    return (
      <>
        <button
          onClick={() => {
            setShowMainContent(!showMainContent);
          }}
          className={`fixed left-1 top-24 btn btn-purple mt-4 zz-top-plus4 -translate-x-[55px] hover:translate-x-0 transition-transform`}
        >
          {!showMainContent ? "Main" : "CMS"}
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
  } else return <MainWrap>{children}</MainWrap>;
}
