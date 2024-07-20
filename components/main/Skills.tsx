import React from "react";
import mongo from "../../images/icon--mongodb.png";
import firebase from "../../images/icon--firebase.png";
import appwrite from "../../images/icon--appwrite.png";
import react from "../../images/icon--react.png";
import Image from "next/image";

const Skills = () => {
  const images = [mongo, firebase, appwrite, react];
  return (
    <article>
      <h2 className="text-center text-2xl font-bold mb-1">My Skills</h2>
      <div className="flex gap-2 bg-black dark:bg-white dark:bg-opacity-10 bg-opacity-10 p-2 rounded-full">
        {images.map((img, index) => (
          <div
            className="cursor-pointer flex items-center bg-black dark:bg-white dark:bg-opacity-15 bg-opacity-15 rounded-full p-2"
            key={index}
          >
            <Image width={25} height={25} src={img} alt={"dffsd"} />
          </div>
        ))}
      </div>
    </article>
  );
};

export default Skills;
