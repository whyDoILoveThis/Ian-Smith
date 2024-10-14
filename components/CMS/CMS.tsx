import React from "react";
import HeaderCMS from "./HeaderCMS";
import SkillsCMS from "./SkillsCMS";
import ProjectsCMS from "./ProjectsCMS";
import { SignOutButton } from "@clerk/nextjs";

const CMS = () => {
  return (
    <article className="w-full max-w-[800px] p-4">
      <div className="flex justify-center gap-2">
        <h1 className="text-5xl font-bold text-center mb-4">CMS </h1>
        <SignOutButton />
      </div>
      <div className="w-full flex justify-center">
        <HeaderCMS />
      </div>
      <SkillsCMS />
      <ProjectsCMS />
    </article>
  );
};

export default CMS;
