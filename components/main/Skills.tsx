"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { AiOutlineShrink } from "react-icons/ai";

const Skills = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [myIndex, setMyIndex] = useState(-99);
  const [isSelected, setIsSelected] = useState(false);

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
        <ul className="max-w-fit rounded-3xl relative flex flex-wrap gap-2 bg-black dark:bg-white dark:bg-opacity-10 bg-opacity-10 p-2">
          {isSelected && (
            <button
              onClick={() => {
                setIsSelected(false);
                setMyIndex(-99);
              }}
              className="absolute -top-2 -right-2 font-bold cursor-pointer bg-black dark:bg-white dark:bg-opacity-15 bg-opacity-15 rounded-full w-fit h-fit"
            >
              <AiOutlineShrink />
            </button>
          )}

          {skills.map((skill, index) => {
            const isMyIndex = index === myIndex;
            return (
              <li
                className={`${
                  !isMyIndex && isSelected && "blur-lg"
                } cursor-pointer flex items-center w-fit bg-black dark:bg-white dark:bg-opacity-15 bg-opacity-15 rounded-full p-3`}
                key={skill.id}
                onClick={() => {
                  setMyIndex(index);
                  setIsSelected(true);
                }}
              >
                <Image
                  src={skill.fileURL}
                  alt={skill.text}
                  width={25}
                  height={25}
                />
                {isMyIndex && <span>{skill.text}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};

export default Skills;
