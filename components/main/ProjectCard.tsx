"use client";
import Image from "next/image";
import styles from "../../styles/ProjectCard.module.css";

import { useEffect, useRef, useState } from "react";
import { MdModeEditOutline } from "react-icons/md";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";
import { handleUrlChange } from "@/lib/handleUrlChange";
import UploadIcon from "../sub/UploadIcon";
import Loader from "./Loader";
import ItsTooltip from "../ui/its-tooltip";
import { appwrImgUp } from "@/appwrite/appwrStorage";
import { appwrSaveOrUpdateProject } from "@/appwrite/appwrSaveOrUpdateProject";
import { appwrFetchSkills } from "@/appwrite/appwrSkillManager";
import DeleteProjPop from "../sub/DeleteProjPop";
import ItsCheckbox from "../ui/its-checkbox";

interface Props {
  project: Project;
  getSkillIcon: (skillText: string) => string;
  handleDelete?: (
    id: string | undefined,
    screenshots?: Screenshot[],
  ) => Promise<void>;
  fetchProjects: () => void;
}

const ProjectCard = ({
  project,
  getSkillIcon,
  handleDelete,
  fetchProjects,
}: Props) => {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [editScreenshots, setEditScreenshots] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showDeletePop, setShowDeletePop] = useState(false);
  const [stack, setStack] = useState<string[]>(project.stack);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [demoUrl, setDemoUrl] = useState("https://");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadedImages, setLoadedImages] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);

  useEffect(() => {
    const checkOverflow = () => {
      if (!ref.current) return;
      const el = ref.current;
      const hasOverflow =
        el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;

      setIsOverflowing(hasOverflow);
    };

    // Wait 1 second before checking
    const timeout = setTimeout(() => {
      checkOverflow();
    }, 1000);

    // Also check on window resize
    const handleResize = () => setTimeout(checkOverflow, 1000);
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [showMoreInfo, editedProject.moreInfo]);

  useEffect(() => {
    // Ensure editedProject syncs with the current project prop
    if (!showEdit) {
      setEditedProject(project);
    }
  }, [showEdit, project]);

  const handleInputChange = (field: keyof Project, value: string) => {
    setEditedProject((prev) => ({ ...prev, [field]: value }));
  };

  const fetchSkills = async () => {
    const skillsList = await appwrFetchSkills();
    setSkills(skillsList);
  };

  useEffect(() => {
    setEditedProject((prev) => ({ ...prev, stack: stack }));
  }, [stack]);

  useEffect(() => {
    setEditedProject((prev) => ({ ...prev, demoUrl: demoUrl }));
  }, [demoUrl]);

  useEffect(() => {
    fetchSkills();
    setDemoUrl(project.demoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setStack([...stack, value]);
    } else {
      setStack(stack.filter((item) => item !== value));
    }
  };

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
        files.map((file) => readFileAsDataURL(file)),
      );
      setImageUrls(imgurls); // Update state after all files are processed
      console.log("Updated imageUrls:", imgurls);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    let screenshotObjs: Screenshot[] = [];

    if (screenshots) {
      // // Step 1: Delete existing screenshots in Firebase Storage
      // if (project.screenshots && project.screenshots.length > 0) {
      //   setLoadingMsg("Replacing old pics...");
      //   const storage = getStorage();
      //   await Promise.all(
      //     project.screenshots.map(async (url) => {
      //       const fileRef = storageRef(
      //         storage,
      //         url.replace(/.*\/o\/(.*?)\?.*/, "$1").replace(/%2F/g, "/")
      //       ); // Extract file path from URL
      //       await deleteObject(fileRef).catch((err) => {
      //         console.warn("Failed to delete file:", err);
      //       });
      //     })
      //   );
      // }

      // Step 2: Upload new screenshots and get URLs
      screenshotObjs = await Promise.all(
        Array.from(screenshots).map(async (file, index) => {
          setLoadingMsg(`Uploading image ${index}...`);
          const imgData = await appwrImgUp(file);
          return {
            url: imgData.url,
            fileId: imgData.fileId,
          } as Screenshot;
        }),
      );
    }

    setLoadingMsg("Adding project info...");

    const theEditedProject = {
      projectId: project.$id,
      title: editedProject.title,
      description: editedProject.description,
      moreInfo: editedProject.moreInfo,
      demoUrl: editedProject.demoUrl,
      screenshots:
        screenshotObjs.length > 0 ? screenshotObjs : project.screenshots,
      stack,
    };

    try {
      await appwrSaveOrUpdateProject(theEditedProject);
      setShowEdit(false);
      setEditScreenshots(false);
      fetchProjects();
      setLoadingMsg("👍 Project updated!");
      setTimeout(() => setLoadingMsg(""), 3000);
      setLoading(false);
    } catch (error) {
      console.error("Error updating project:", error);
      setLoading(false);
    }
  };

  const nextScreenshot = (urls: Screenshot[] | string[]) => {
    setCurrentScreenshot((prev) => (prev + 1) % urls.length);
  };

  const prevScreenshot = (urls: Screenshot[] | string[]) => {
    setCurrentScreenshot((prev) => (prev - 1 + urls.length) % urls.length);
  };

  useEffect(() => {
    if (loadingMsg === "👍 Project updated!") {
      setTimeout(() => {
        setLoadingMsg("");
      }, 3000);
    }
  }, [loadingMsg]);

  useEffect(() => {
    if (loadingDelete) {
      setTimeout(() => {
        setLoadingDelete(false);
      }, 1000);
    }
  }, [loadingDelete]);

  if (loadingDelete) {
    return (
      <div className="fixed zz-top bg-black bg-opacity-40 backdrop-blur-md inset-0 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  console.log(project.screenshots);
  console.log(editedProject.screenshots);
  console.log(screenshots);

  return (
    <li className={styles.project}>
      {handleDelete && (
        <div>
          {showDeletePop && (
            <DeleteProjPop
              project={project}
              handleDelete={handleDelete}
              setShowDeletePop={setShowDeletePop}
              setLoadingDelete={setLoadingDelete}
            />
          )}

          <div className={`${styles.projectCMSBtnsWrap} `}>
            {showEdit ? (
              <h2 className="font-semibold text-xl tracking-tight text-orange-400">
                🚧Editing🚧
              </h2>
            ) : (
              <div className="flex gap-2 items-center">
                <button
                  className="btn btn-red font-semibold text-red-400 text-outline text-sm tracking-wide"
                  onClick={() => setShowDeletePop(true)}
                >
                  ❌ Delete
                </button>
                <button
                  className="btn flex items-center gap-1.5 text-slate-300 font-medium text-sm tracking-wide text-outline"
                  onClick={() => {
                    setShowEdit(!showEdit);
                  }}
                >
                  <MdModeEditOutline /> Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.projectWrap}>
        <div className={styles.screenshotWrap}>
          <article className={styles.screenshotHolder}>
            <div className={styles.imageCycler}>
              {showEdit && (
                <button
                  onClick={() => {
                    setEditScreenshots(!editScreenshots);
                    setImageUrls([]);
                    editScreenshots && setCurrentScreenshot(0);
                  }}
                  className={`${styles.btn} !border-white !border-opacity-55 absolute -bottom-7 right-20 btn btn-sm btn-squish `}
                >
                  {editScreenshots ? (
                    <span>Cancel new pics</span>
                  ) : (
                    <span>Edit pics</span>
                  )}
                </button>
              )}
              {((imageUrls.length > 1 && editScreenshots) ||
                (project.screenshots.length > 1 && !editScreenshots)) && (
                <span>
                  <button
                    onClick={() => {
                      prevScreenshot(
                        editScreenshots ? imageUrls : project.screenshots,
                      );
                    }}
                    className={[styles.btnArrow, styles.btnLeft].join(" ")}
                    title="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => {
                      nextScreenshot(
                        editScreenshots ? imageUrls : project.screenshots,
                      );
                    }}
                    className={[styles.btnArrow, styles.btnRight].join(" ")}
                    title="Next image"
                  >
                    ›
                  </button>
                </span>
              )}
              {project.screenshots && !editScreenshots && (
                <div>
                  {!loadedImages.includes(currentScreenshot) && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center">
                      <LoaderSpinSmall />
                    </span>
                  )}{" "}
                  <Image
                    className={styles.screenshot}
                    width={200}
                    height={140}
                    src={project.screenshots[currentScreenshot]?.url || ""}
                    alt="Screenshot"
                    onLoad={() => {
                      if (!loadedImages.includes(currentScreenshot)) {
                        setLoadedImages((prev) => [...prev, currentScreenshot]);
                      }
                    }}
                    style={{
                      opacity: loadedImages.includes(currentScreenshot)
                        ? "1"
                        : "0.5",
                    }}
                    onClick={() => setIsFullscreen(true)}
                  />
                </div>
              )}
              {editScreenshots && imageUrls.length <= 0 && (
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
              {editScreenshots && imageUrls.length > 0 && (
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
        </div>
        <div className={styles.infoWrap}>
          {showEdit ? (
            <>
              <input
                value={editedProject.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={`${styles.name} w-full bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 rounded-lg p-1.5 px-4 text-white placeholder:text-white/30 transition-colors`}
              />
              <textarea
                value={editedProject.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={`${styles.description} bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 rounded-lg p-1.5 px-4 text-white/80 placeholder:text-white/30 transition-colors`}
              />
              <input
                value={demoUrl || " https://"}
                onChange={(e) => handleUrlChange(e, setDemoUrl)}
                placeholder="Demo URL"
                className={`bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 rounded-lg p-1.5 px-4 text-white/80 placeholder:text-white/30 transition-colors`}
              />
              <textarea
                value={editedProject.moreInfo}
                onChange={(e) => handleInputChange("moreInfo", e.target.value)}
                className={`${styles.moreInfo} h-[200px] min-h-24 w-full bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 rounded-lg p-1.5 px-4 text-white/70 placeholder:text-white/30 transition-colors`}
              />
            </>
          ) : (
            <>
              <h3 className={styles.name}>{project.title}</h3>
              <p className={styles.description}>{project.description}</p>
            </>
          )}
          {showEdit ? (
            <div className={`${styles.btnWrap} mt-2`}>
              <button
                className={`${styles.btn} !bg-green-400 !bg-opacity-45 hover:!bg-opacity-35 !border-green-400`}
                onClick={handleSave}
              >
                {loading ? <LoaderSpinSmall /> : <span>Save</span>}
              </button>
              <button
                className={`${styles.btn} !bg-red-400 !bg-opacity-45 hover:!bg-opacity-35 !border-red-400`}
                onClick={() => {
                  setShowEdit(false);
                  setEditScreenshots(false);
                }}
              >
                Cancel
              </button>
              <span className="absolute left-0 -bottom-4 text-nowrap">
                {loadingMsg}
              </span>
            </div>
          ) : (
            <div className={styles.btnWrap}>
              {project.moreInfo && project.moreInfo !== "" && (
                <button
                  className={styles.btn}
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                >
                  {showMoreInfo ? "Hide Info" : "More Info👇"}
                </button>
              )}

              {project.demoUrl &&
                project.demoUrl !== "" &&
                project.demoUrl !== "https://" && (
                  <a href={project.demoUrl} target="_blank" rel="noreferrer">
                    <button className={styles.btn}>Demo👀</button>
                  </a>
                )}
              <span className="absolute -top-2 text-nowrap">{loadingMsg}</span>
            </div>
          )}
          <p
            ref={ref}
            className={`${
              isOverflowing ? styles.moreInfoOverflow : styles.moreInfo
            } ${
              showMoreInfo && !showEdit
                ? "max-h-80 max-w-72"
                : "max-h-0 max-w-0 !p-0 !border-none"
            } transition-all duration-1000 overflow-hidden`}
          >
            {project.moreInfo}
          </p>
        </div>
        <ul className={styles.stackWrap}>
          {showEdit &&
            stack.map((skill) => (
              <li key={skill}>
                <Image
                  width={25}
                  height={25}
                  src={getSkillIcon(skill)}
                  alt={skill}
                />
              </li>
            ))}
          {!showEdit &&
            project.stack.map((skill) => (
              <li className="!cursor-default" key={skill}>
                <ItsTooltip delay={600} tooltipText={skill}>
                  <Image
                    width={25}
                    height={25}
                    src={getSkillIcon(skill)}
                    alt={skill}
                    className="!cursor-default"
                  />
                </ItsTooltip>
              </li>
            ))}
        </ul>
      </div>
      {showEdit && (
        <div className="flex flex-wrap max-w-[75%] gap-2 p-3 mx-8 bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-t-none rounded-2xl">
          <h2 className="w-full text-center font-semibold text-base tracking-tight text-white/80">
            Select Stack
          </h2>
          {skills.map((skill) => (
            <div
              className="flex gap-2 border border-white/10 rounded-full w-fit p-2 px-4 hover:border-white/20 transition-colors"
              key={skill.id}
            >
              <ItsCheckbox
                value={skill.text}
                defaultChecked={project.stack.includes(skill.text)}
                onChange={handleStackChange}
              />

              <div className="flex items-center gap-1">
                {skill.url && (
                  <Image
                    className="h-fit"
                    width={20}
                    height={20}
                    src={skill.url}
                    alt="left"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {isFullscreen && (
        <div className="fixed backdrop-blur-xl inset-0 zz-top-plus3 flex items-center justify-center bg-black/85">
          {showFullscreenControls && (
            <div className="zz-top-plus-4">
              <button
                className="absolute top-20 right-4 text-2xl btn btn-round btn-red !bg-red-500/60 backdrop-blur-sm hover:!bg-red-500/80 transition-colors"
                onClick={() => setIsFullscreen(false)}
              >
                ✖
              </button>
              <button
                className="absolute left-4 text-white text-2xl btn btn-round !bg-black/40 hover:!bg-black/60 transition-colors"
                onClick={() => prevScreenshot(project.screenshots)}
                title="Previous image"
              >
                ‹
              </button>
              <button
                className="absolute right-4 text-white text-2xl btn btn-round !bg-black/40 hover:!bg-black/60 transition-colors"
                onClick={() => nextScreenshot(project.screenshots)}
                title="Next image"
              >
                ›
              </button>
            </div>
          )}
          <Image
            onClick={() => {
              setShowFullscreenControls(!showFullscreenControls);
            }}
            className=""
            width={1200}
            height={1200}
            src={project.screenshots[currentScreenshot]?.url || ""}
            alt="Screenshot"
            onLoad={() => {
              if (!loadedImages.includes(currentScreenshot)) {
                setLoadedImages((prev) => [...prev, currentScreenshot]);
              }
            }}
            style={{
              opacity: loadedImages.includes(currentScreenshot) ? "1" : "0.5",
            }}
          />
        </div>
      )}
    </li>
  );
};

export default ProjectCard;
