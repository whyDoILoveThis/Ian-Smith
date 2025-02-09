"use client";
import React, { useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { db } from "@/lib/firebaseConfig";
import { Button } from "../ui/button";
import UploadIcon from "../sub/UploadIcon";

const SkillsComponent: React.FC = () => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");

  const fetchSkills = async () => {
    const querySnapshot = await getDocs(collection(db, "skills"));
    const skillsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setSkills(skillsList);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      // Use FileReader to read and display the image
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = async () => {
    if (file && text) {
      const storage = getStorage();
      const storageRef = ref(storage, `images/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileURL = await getDownloadURL(storageRef);

      const newSkill = {
        text,
        fileURL,
      };

      await addDoc(collection(db, "skills"), newSkill);
      fetchSkills();
      setText("");
      setImageUrl("");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "skills", id));
    fetchSkills();
  };

  React.useEffect(() => {
    fetchSkills();
  }, []);

  console.log(skills);

  return (
    <div className="mt-4 col-flex items-center rounded-2xl p-4">
      <p>For best results, remember to use a perfectly square image.</p>
      <div className="flex gap-1 items-center">
        {imageUrl !== "" && (
          <Image width={50} height={50} src={imageUrl} alt={""} />
        )}
        <p>{text !== "" && text}</p>
      </div>
      <div className="bg-slate-500 bg-opacity-20 p-2 my-2 rounded-2xl col-flex gap-2 items-center max-w-[300px]">
        <label htmlFor="headerImg">Skill Icon</label>
        <div className="relative border-2 rounded-xl border-dashed p-2 px-4">
          <input
            id="headerImg"
            className="w-full h-full opacity-0 absolute"
            onChange={handleFileChange}
            type="file"
          />
          <UploadIcon />
        </div>{" "}
        <div>
          <input
            className="input"
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Skill name..."
          />
        </div>
        <button className="btn btn-green place-self-end" onClick={handleSubmit}>
          Add Skill
        </button>
      </div>
      <ul className="flex flex-wrap py-2 px-4 gap-2 bg-black dark:bg-white dark:bg-opacity-10 bg-opacity-10 rounded-2xl">
        {skills.map((skill) => (
          <li
            className="cursor-pointer flex gap-1 items-center bg-black dark:bg-white dark:bg-opacity-15 bg-opacity-15 rounded-full p-2"
            key={skill.id}
          >
            <Image
              src={skill.fileURL}
              alt={skill.text}
              width={25}
              height={25}
            />
            <span>{skill.text}</span>
            <button
              className="btn btn-round btn-red"
              onClick={() => handleDelete(skill.id)}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SkillsComponent;
