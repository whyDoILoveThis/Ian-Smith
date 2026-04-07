"use client";
import React, { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { appwrFetchProjects } from "@/appwrite/appwrGetProjects";
import { appwrFetchSkills } from "@/appwrite/appwrSkillManager";
import LivingLine from "@/components/sub/LivingLine";

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
      <article>
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
