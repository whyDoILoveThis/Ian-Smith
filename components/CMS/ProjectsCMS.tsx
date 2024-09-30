"use client";
import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { uuid } from "uuidv4";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import UploadIcon from "../sub/UploadIcon";
import ProjectCard from "../main/ProjectCard";
import Loader from "../main/Loader";

const ProjectsComponent: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moreInfo, setMoreInfo] = useState("");
  const [screenshots, setScreenshots] = useState<FileList | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSkills = async () => {
    const querySnapshot = await getDocs(collection(db, "skills"));
    const skillsList = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Skill)
    );
    setSkills(skillsList);
  };

  const fetchProjects = async () => {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const projectsList = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Project)
    );
    setProjects(projectsList);
  };

  useEffect(() => {}, [projects]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setScreenshots(e.target.files);
    }
  };

  const handleStackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setStack([...stack, value]);
    } else {
      setStack(stack.filter((item) => item !== value));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (screenshots) {
      const storage = getStorage();
      const screenshotUrls = await Promise.all(
        Array.from(screenshots).map(async (file) => {
          const storageRef = ref(storage, `screenshots/${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );

      const newProject = {
        title,
        description,
        moreInfo,
        screenshots: screenshotUrls,
        stack,
      };

      await addDoc(collection(db, "projects"), newProject);
      fetchProjects();
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (id) {
      console.log("trying delete: ", id);
      await deleteDoc(doc(db, "projects", id));
    }
    fetchProjects();
  };

  useEffect(() => {
    fetchSkills();
    fetchProjects();
  }, []);

  const getSkillIcon = (skillText: string) => {
    const skill = skills.find((s) => s.text === skillText);
    return skill ? skill.fileURL : "";
  };

  return (
    <div>
      <article className="border col-flex items-center gap-3 rounded-2xl m-2 p-2">
        <h1>Projects Component</h1>
        <div className="max-w-[300px] col-flex gap-2">
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="headerImg">Project Screenshots</label>
            <div className="relative border-2 rounded-xl border-dashed p-2 px-4">
              <input
                multiple
                id="headerImg"
                className="w-full h-full opacity-0 absolute"
                onChange={handleFileChange}
                type="file"
              />
              <UploadIcon />
            </div>{" "}
          </div>
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="Title">Title</label>
            <input
              className="input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="Description">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="More Info">More Info</label>
            <input
              className="input"
              value={moreInfo}
              onChange={(e) => setMoreInfo(e.target.value)}
              placeholder="More Info"
            />
          </div>
          <div className="col-flex w-full gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <h2>Select Stack</h2>
            {skills.map((skill) => (
              <div key={skill.id}>
                <input
                  type="checkbox"
                  value={skill.text}
                  onChange={handleStackChange}
                />{" "}
                {skill.text}
              </div>
            ))}
          </div>
          <button className="btn place-self-end" onClick={handleSubmit}>
            {isLoading ? <Loader /> : <p>Submit</p>}
          </button>
        </div>
      </article>
      <article>
        {projects.map((project, index) => (
          <ProjectCard
            key={index}
            project={project}
            getSkillIcon={getSkillIcon}
            handleDelete={handleDelete}
          />
        ))}
      </article>
    </div>
  );
};

export default ProjectsComponent;
