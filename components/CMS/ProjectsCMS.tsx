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
  const [demoUrl, setDemoUrl] = useState("");
  const [error, setError] = useState<string | null>(null); // To display errors

  const [screenshots, setScreenshots] = useState<File[] | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
      const files = Array.from(e.target.files); // Convert FileList to an array of files
      setScreenshots(files); // Set screenshots as an array of files

      const imageUrls: string[] = []; // Array to store base64 strings

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            imageUrls.push(reader.result); // Push base64 string to the array
            if (imageUrls.length === files.length) {
              setImageUrls(imageUrls); // Set the array of base64 strings when all files are processed
            }
          }
        };
        reader.readAsDataURL(file); // Read the file as a Data URL (base64)
      });
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;

    // Ensure that https:// is always present at the start of the URL
    if (!userInput.startsWith("https://")) {
      setDemoUrl("https://");
    } else {
      setDemoUrl(userInput);
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
        demoUrl,
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
    <>
      <article className="w-full border col-flex items-center gap-3 rounded-2xl mb-2 mt-8 p-4">
        <h1 className="text-center">Projects Component</h1>
        <div className="col-flex items-center gap-2">
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="headerImg">Project Screenshots</label>
            {imageUrls !== null && (
              <div className="col-flex gap-2">
                {imageUrls.map((imageUrl, index) => (
                  <div key={index}>
                    <Image width={260} height={50} src={imageUrl} alt={""} />
                  </div>
                ))}
              </div>
            )}{" "}
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
            <p className=" font-bold">{title && title}</p>
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
            <p>{description && description}</p>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="More Info">More Info</label>
            <p>{moreInfo && moreInfo}</p>

            <input
              className="input"
              value={moreInfo}
              onChange={(e) => setMoreInfo(e.target.value)}
              placeholder="More Info"
            />
          </div>
          <div className="col-flex w-full items-center gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <label htmlFor="Demo Url">Demo Url</label>
            <p className="text-sm">{demoUrl && demoUrl}</p>
            <input
              className="input"
              value={demoUrl || " https://"}
              onChange={handleUrlChange}
              placeholder="Demo Url"
            />
          </div>
          <div className="col-flex w-full gap-2 border rounded-2xl bg-black bg-opacity-20 p-4 px-6">
            <h2>Select Stack</h2>
            {skills.map((skill) => (
              <div
                className="flex gap-2 border rounded-full w-fit p-2 px-4"
                key={skill.id}
              >
                <input
                  type="checkbox"
                  value={skill.text}
                  onChange={handleStackChange}
                />{" "}
                <div className="flex items-center gap-1">
                  {skill.fileURL && (
                    <Image
                      className="h-fit"
                      width={20}
                      height={20}
                      src={skill.fileURL}
                      alt="left"
                    />
                  )}
                  <p>{skill.text}</p>
                </div>
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
    </>
  );
};

export default ProjectsComponent;
