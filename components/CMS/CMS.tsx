"use client";

import React, { useEffect, useState } from "react";
import HeaderCMS from "./HeaderCMS";
import SkillsCMS from "./SkillsCMS";
import ProjectsCMS from "./ProjectsCMS";
import { SignOutButton, useAuth, UserButton, useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoutIcon from "../sub/LogoutIcon";
import AiConversationsCMS from "./AiConversationsCMS";
import {
  appwrGetSecurityFlag,
  appwrSetSecurityFlag,
} from "@/appwrite/appwrUpdateSecurity";

const CMS = () => {
  const { user } = useUser();
  return (
    <article className="w-full flex flex-col items-center max-w-[800px] p-4">
      <h1 className="text-5xl font-bold text-center mb-4">Portfolio CMS</h1>
      <div className="flex items-center gap-1">
        <UserButton />
        <span>{user?.emailAddresses[0]?.emailAddress || ""}</span>
      </div>
      {/* Security toggle */}
      <div className="w-full flex justify-center my-4">
        <div className="flex items-center gap-3">
          <SecurityToggle />
        </div>
      </div>
      {/*  */}
      <div className="fixed zz-top btn btn-round backdrop-blur-md btn-red w-fit h-fit left-4 top-16">
        <span className="absolute opacity-0">
          <SignOutButton />
        </span>
        <LogoutIcon />
      </div>

      <Tabs className="flex flex-col items-center w-full" defaultValue="header">
        <TabsList className="w-fit">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="convos">Convos</TabsTrigger>
        </TabsList>
        <TabsContent value="header">
          <div className="w-full flex justify-center">
            <HeaderCMS />
          </div>
        </TabsContent>
        <TabsContent value="skills">
          <SkillsCMS />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsCMS />
        </TabsContent>
        <TabsContent className="w-full" value="convos">
          <AiConversationsCMS />
        </TabsContent>
      </Tabs>
    </article>
  );
};

export default CMS;

interface SecurityToggleProps {
  setHasBeenToggled?: (val: boolean) => void;
}

export function SecurityToggle({ setHasBeenToggled }: SecurityToggleProps) {
  const [loading, setLoading] = useState(true);
  const [isSecurityMaxed, setIsSecurityMaxed] = useState(false);

  useEffect(() => {
    setHasBeenToggled && setHasBeenToggled(isSecurityMaxed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSecurityMaxed]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flag = await appwrGetSecurityFlag();
        if (mounted) setIsSecurityMaxed(flag);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isSecurityMaxed;
    setIsSecurityMaxed(next);
    setLoading(true);
    try {
      await appwrSetSecurityFlag(next);
    } catch (err) {
      console.error(err);
      setIsSecurityMaxed((s) => !s);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 justify-center items-center">
      <span className="font-medium text-center">
        Security {isSecurityMaxed ? "Maxed" : "Loose"}
      </span>

      <button
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={isSecurityMaxed}
        className={`relative inline-flex h-6 w-12 items-center rounded-full p-1 transition-colors duration-200 ${
          isSecurityMaxed ? "bg-green-500" : "bg-gray-300"
        } ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            isSecurityMaxed ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
