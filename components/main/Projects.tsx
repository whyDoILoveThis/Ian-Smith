"use client";
import React, { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { appwrFetchProjects } from "@/appwrite/appwrGetProjects";
import { appwrFetchSkills } from "@/appwrite/appwrSkillManager";

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const fetchSkills = async () => {
    const skillsList = await appwrFetchSkills();
    setSkills(skillsList);
  };

  const fetchProjects = async () => {
    setProjects(await appwrFetchProjects());
  };

  useEffect(() => {
    fetchSkills();
    fetchProjects();
  }, []);

  useEffect(() => {}, [projects]);

  const getSkillIcon = (skillText: string) => {
    const skill = skills.find((s) => s.text === skillText);
    return skill ? skill.url : "";
  };

  if (!projects || !skills) return <div></div>;

  return (
    <div>
      {" "}
      <article>
        <h2 className="text-center text-4xl md:text-5xl font-extrabold mt-24 mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
          My Projects
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 via-blue-500 to-transparent rounded-full mx-auto mb-12" />

        {projects.map((project, index) => (
          <ProjectCard
            key={index}
            project={project}
            getSkillIcon={getSkillIcon}
            fetchProjects={fetchProjects}
          />
        ))}
      </article>
    </div>
  );
};

export default Projects;
