"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../../styles/ProjectCard.module.css";
import chevron from "../../images/icon--chevron.png";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import ProjectCard from "../main/ProjectCard";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import UploadIcon from "../sub/UploadIcon";
import { handleUrlChange } from "@/lib/handleUrlChange";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";
import { appwrImgUp } from "@/appwrite/appwrStorage";

const ProjectsCMS = () => {
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    demoUrl: "",
    stack: [] as string[],
    screenshots: [] as string[],
    moreInfo: "",
  });

  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [screenshots, setScreenshots] = useState<File[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stack, setStack] = useState<string[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [checkboxStates, setCheckboxStates] = useState(stack.map(() => false));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [demoUrl, setDemoUrl] = useState("");
  const formErrMsgs = {
    titleErr: "Title is required",
    descErr: "Description is required",
    screenshotsErr: "Must include atleast 1 screenshot",
  };
  const [titleError, setTitleError] = useState(false);
  const [descrError, setDescError] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);

  useEffect(() => {
    if (screenshots?.length && screenshots?.length > 0) {
      setScreenshotError(false);
    }
  }, [screenshots]);

  useEffect(() => {
    if (newProject.title !== "") {
      setTitleError(false);
    }
  }, [newProject.title]);

  useEffect(() => {
    if (newProject.description !== "") {
      setDescError(false);
    }
  }, [newProject.description]);

  const handleCheckboxChange = (index: number) => {
    setCheckboxStates((prev) =>
      prev.map((checked, i) => (i === index ? !checked : checked))
    );
  };

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files); // Convert FileList to an array
      console.log("files", files);

      setScreenshots(files); // Update screenshots as an array of files

      // Convert files to base64 using Promise.all
      const readFileAsDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result); // Resolve with the base64 string
            }
          };
          reader.onerror = reject; // Handle errors
          reader.readAsDataURL(file); // Read the file
        });

      const imgurls = await Promise.all(
        files.map((file) => readFileAsDataURL(file))
      );
      setImageUrls(imgurls); // Update state after all files are processed
      console.log("Updated imageUrls:", imgurls);
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
    if (!newProject.title || !newProject.description || !screenshots) {
      !newProject.title && setTitleError(true);
      !newProject.description && setDescError(true);
      !screenshots && setScreenshotError(true);
      setIsLoading(false);
      return;
    }
    if (screenshots) {
      const screenshotObjs = await Promise.all(
        Array.from(screenshots).map(async (file, index) => {
          setLoadingMessage(`Uploading image ${index}...`);
          const imgData = await appwrImgUp(file);
          return imgData;
          //return getDownloadURL(fileStorageRef);
        })
      );
      setLoadingMessage("Adding project info...");

      const theNewProject = {
        title: newProject.title,
        description: newProject.description,
        moreInfo: newProject.moreInfo,
        demoUrl: newProject.demoUrl,
        screenshots: screenshotObjs,
        stack,
      };

      await addDoc(collection(db, "projects"), theNewProject);
      fetchProjects();
      setNewProject({
        title: "",
        description: "",
        demoUrl: "",
        stack: [] as string[],
        screenshots: [] as string[],
        moreInfo: "",
      });
      setScreenshots(null);
      setImageUrls([]);
      setStack([]);
      setDemoUrl("https://");
      setCheckboxStates(skills.map(() => false));
      setLoadingMessage("👍 Project Added!");
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

  const handleInputChange = (field: keyof typeof newProject, value: string) => {
    setNewProject((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setNewProject((prev) => ({ ...prev, demoUrl: demoUrl }));
  }, [demoUrl]);

  const nextScreenshot = () => {
    setCurrentScreenshot(
      (prev) => (prev + 1) % (imageUrls.length || 1) // Prevent divide-by-zero
    );
  };

  const prevScreenshot = () => {
    setCurrentScreenshot(
      (prev) => (prev - 1 + (imageUrls.length || 1)) % (imageUrls.length || 1)
    );
  };

  console.log("imageUrls");

  return (
    <article>
      <li className={styles.project}>
        <div className={styles.projectWrap}>
          <div className={styles.screenshotWrap}>
            <article className={styles.screenshotHolder}>
              <div className={styles.imageCycler}>
                {imageUrls.length > 0 && (
                  <span className="zz-20">
                    <button
                      onClick={() => {
                        setImageUrls([]);
                        setScreenshots(null);
                      }}
                      className="absolute -bottom-7 right-20 btn btn-sm btn-squish btn-red !text-red-200 !bg-opacity-50 hover:!bg-opacity-40 transition-colors"
                    >
                      clear pics
                    </button>
                    <button
                      onClick={prevScreenshot}
                      className={[styles.btnArrow, styles.btnLeft].join(" ")}
                    >
                      <Image src={chevron} alt="left" />
                    </button>
                    <button
                      onClick={nextScreenshot}
                      className={[styles.btnArrow, styles.btnRight].join(" ")}
                    >
                      <Image src={chevron} alt="right" />
                    </button>
                  </span>
                )}
                {imageUrls.length > 0 && (
                  <Image
                    className={styles.screenshot}
                    width={200}
                    height={140}
                    src={imageUrls[currentScreenshot]}
                    alt="Screenshot"
                  />
                )}
              </div>
            </article>
            {/** screenshot selector */}
            {imageUrls.length <= 0 && (
              <div className="col-flex w-full h-full items-center justify-center gap-2">
                <label htmlFor="headerImg" className="text-slate-300">
                  Project Screenshots
                </label>
                <div className="relative border-2 rounded-xl border-dashed p-2 px-4">
                  <input
                    multiple
                    id="headerImg"
                    className="w-full h-full opacity-0 absolute"
                    onChange={handleFileChange}
                    type="file"
                  />
                  <UploadIcon />
                </div>
              </div>
            )}
            {screenshotError && (
              <p className="absolute bottom-1 btn btn-nohover btn-sm btn-squish btn-red">
                {formErrMsgs.screenshotsErr}
              </p>
            )}
          </div>
          <div className={`${styles.infoWrap}`}>
            {titleError && (
              <p className="btn btn-nohover btn-sm btn-squish btn-red translate-y-3">
                {formErrMsgs.titleErr}
              </p>
            )}
            <input
              value={newProject.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Project Title"
              className={`${styles.name} w-full bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
            />
            {descrError && (
              <p className="btn btn-nohover btn-sm btn-squish btn-red translate-y-3">
                {formErrMsgs.descErr}
              </p>
            )}
            <textarea
              value={newProject.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Project Description"
              className={`${styles.description} bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
            />
            <input
              value={demoUrl || " https://"}
              onChange={(e) => handleUrlChange(e, setDemoUrl)}
              placeholder="Demo URL"
              className={`bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
            />
            <textarea
              value={newProject.moreInfo}
              onChange={(e) => handleInputChange("moreInfo", e.target.value)}
              placeholder="More Info"
              className={`${styles.moreInfo} mb-2 bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4 mt-2`}
            />
            <div className={styles.btnWrap}>
              <span className="col-flex">
                <button className={styles.btn} onClick={handleSubmit}>
                  {isLoading ? <LoaderSpinSmall /> : <span>Add Project</span>}
                </button>
                <p>{loadingMessage}</p>
              </span>
            </div>
          </div>
          <ul className={styles.stackWrap}>
            {stack.map((skill) => (
              <li key={skill}>
                <Image
                  width={25}
                  height={25}
                  src={getSkillIcon(skill)}
                  alt={skill}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap max-w-[75%] gap-2 p-2 mx-8 bg-white bg-opacity-5 rounded-t-none rounded-2xl ">
          <h2 className="w-full text-center font-bold text-lg">Select Stack</h2>
          {skills.map((skill, index) => (
            <div
              className="flex gap-2 border rounded-full w-fit p-2 px-4"
              key={skill.id}
            >
              <input
                type="checkbox"
                value={skill.text}
                checked={checkboxStates[index]}
                onChange={(e) => {
                  handleStackChange(e);
                  handleCheckboxChange(index);
                }}
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
              </div>
            </div>
          ))}
        </div>
      </li>

      <article>
        {projects.map((project, index) => (
          <ProjectCard
            key={index}
            project={project}
            getSkillIcon={getSkillIcon}
            handleDelete={handleDelete}
            fetchProjects={fetchProjects}
          />
        ))}
      </article>
    </article>
  );
};

export default ProjectsCMS;
