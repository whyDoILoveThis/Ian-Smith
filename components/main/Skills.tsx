"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { AiOutlineShrink } from "react-icons/ai";

const Skills = () => {
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      const querySnapshot = await getDocs(collection(db, "skills"));
      const skillsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSkills(skillsList);
    };

    fetchSkills();
  }, []);

  return (
    <article className="flex flex-col items-center">
      <div className="w-fit">
        <h2 className="text-center text-2xl font-bold mb-4 mt-10">My Skills</h2>
        <ul className="w-fit rounded-3xl relative flex flex-wrap gap-2 bg-black dark:bg-white dark:bg-opacity-10 bg-opacity-10 p-2">
          {skills.map((skill) => {
            return (
              <li
                className={` flex flex-col gap-1 items-center w-fit bg-black
                             dark:bg-white dark:bg-opacity-5 bg-opacity-10 rounded-2xl p-1.5 px-3 pb-0.5`}
                key={skill.id}
              >
                <Image
                  src={skill.fileURL}
                  alt={skill.text}
                  width={25}
                  height={25}
                />
                <span className="text-sm ">{skill.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};

export default Skills;
