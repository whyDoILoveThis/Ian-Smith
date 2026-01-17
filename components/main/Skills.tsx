"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSkills } from "@/hooks/useSkills";

const Skills = () => {
  const skills = useSkills();

  if (!skills) return <div></div>;

  return (
    <article className="flex flex-col items-center">
      <div className="w-fit max-w-2xl">
        {/* Section Title */}
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-6 mt-12 tracking-tight text-neutral-900 dark:text-neutral-100">
          My Skills
        </h2>

        {/* Skills Grid */}
        <ul className="mx-2 flex flex-wrap justify-center gap-3 p-4 rounded-3xl bg-neutral-900/5 dark:bg-white/5 backdrop-blur-sm shadow-inner">
          {skills.map((skill) => (
            <li
              key={skill.$id}
              className="flex flex-col items-center gap-1 w-fit rounded-2xl px-4 py-3 bg-neutral-900/5 dark:bg-white/10"
            >
              <Image
                src={skill.url}
                alt={skill.text}
                width={32}
                height={32}
                className="drop-shadow-sm"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {skill.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

export default Skills;
