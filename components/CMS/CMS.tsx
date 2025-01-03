import React from "react";
import HeaderCMS from "./HeaderCMS";
import SkillsCMS from "./SkillsCMS";
import ProjectsCMS from "./ProjectsCMS";
import { SignOutButton } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CMS = () => {
  return (
    <article className="w-full flex flex-col items-center max-w-[800px] p-4">
      <div className="flex justify-center gap-2">
        <h1 className="text-5xl font-bold text-center mb-4">CMS </h1>
        <SignOutButton />
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
