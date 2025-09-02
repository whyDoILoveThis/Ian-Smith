"use client";
import React, { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const fetchSkills = async () => {
    const querySnapshot = await getDocs(collection(db, "skills"));
    const skillsList = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Skill)
    );
    setSkills(skillsList);
  };

  const fetchProjects = async () => {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const projectsList = querySnapshot.docs.map((doc) => doc.data() as Project);
    setProjects(projectsList);
  };

  useEffect(() => {
    fetchSkills();
    fetchProjects();
  }, []);

  useEffect(() => {}, [projects]);

  const getSkillIcon = (skillText: string) => {
    const skill = skills.find((s) => s.text === skillText);
    return skill ? skill.fileURL : "";
  };

  if (!projects || !skills) return <div></div>;

  return (
    <div>
      {" "}
      <article>
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mt-24 tracking-tight text-neutral-900 dark:text-neutral-100">
          My Projects
        </h2>

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
