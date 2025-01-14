import React from "react";
import HeaderCMS from "./HeaderCMS";
import SkillsCMS from "./SkillsCMS";
import ProjectsCMS from "./ProjectsCMS";
import { SignOutButton } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoutIcon from "../sub/LogoutIcon";

const CMS = () => {
  return (
    <article className="w-full flex flex-col items-center max-w-[800px] p-4">
      <h1 className="text-5xl font-bold text-center mb-4">CMS </h1>
      <div className="fixed zz-top btn btn-round backdrop-blur-md btn-red w-fit h-fit left-4 top-16">
        <span className="absolute opacity-0">
          <SignOutButton />
        </span>
        <LogoutIcon />
      </div>

      <Tabs className="flex flex-col items-center" defaultValue="header">
        <TabsList className="w-fit">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
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
      </Tabs>
    </article>
  );
};

export default CMS;
