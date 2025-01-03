"use client";
import Image from "next/image";
import styles from "../../styles/ProjectCard.module.css";
import chevron from "../../images/icon--chevron.png";
import { useEffect, useState } from "react";
import { MdModeEditOutline } from "react-icons/md";
import "@/styles/UnderConstruction.css";
import { handleUrlChange } from "@/lib/handleUrlChange";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

interface Props {
  project: Project;
  getSkillIcon: (skillText: string) => string;
  handleDelete?: (id: string | undefined) => Promise<void>;
}

const ProjectCard = ({ project, getSkillIcon, handleDelete }: Props) => {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showDeletePop, setShowDeletePop] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [demoUrl, setDemoUrl] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showEditStack, setShowEditStack] = useState(false);

  const fetchSkills = async () => {
    const querySnapshot = await getDocs(collection(db, "skills"));
    const skillsList = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Skill)
    );
    setSkills(skillsList);
  };

  useEffect(() => {
    const g = async () => {
      skills.length <= 0 && (await fetchSkills());
    };
    g();
  }, [showEdit, skills.length]);

  const nextScreenshot = () => {
    setCurrentScreenshot((prev) => (prev + 1) % project.screenshots.length);
  };

  const prevScreenshot = () => {
    setCurrentScreenshot(
      (prev) =>
        (prev - 1 + project.screenshots.length) % project.screenshots.length
    );
  };

  console.log("projectId", project);

  return (
    <li className={styles.project}>
      {handleDelete && (
        <div>
          {showDeletePop && (
            <div className="fixed top-0 left-0 z-[99999] col-flex items-center justify-center w-full h-full bg-black bg-opacity-50 backdrop-blur-lg">
              <p className="rounded-xl p-2 border border-red-400 text-red-200 btn-red text-lg">
                About to <b>DELETE</b>: {project.title}
              </p>
              <p className="text-xl mt-4">
                This action is <b className=" underline">NOT</b> reversable!!!
              </p>
              <p className="text-2xl mt-4 mb-1 font-bold">Are you sure???</p>
              <div className="flex gap-6">
                <button
                  className="border-2 border-green-500 rounded-xl p-2"
                  onClick={() => handleDelete(project.id)}
                >
                  Yes
                </button>
                <button
                  className="border-2 border-red-500 rounded-xl p-2"
                  onClick={() => setShowDeletePop(false)}
                >
                  NO!
                </button>
              </div>
            </div>
          )}
          <div className=" translate-y-5 flex gap-2 border p-4 pt-2 border-b-0 rounded-t-3xl">
            <button
              className="translate-y-2 btn btn-red font-bold text-red-600 text-outline"
              onClick={() => setShowDeletePop(true)}
            >
              ❌ Delete
            </button>
            <button
              className="translate-y-2 btn flex items-center gap-1 text-slate-300 font-bold text-outline"
              onClick={() => {
                showEdit && setShowEditStack(false);
                setShowEdit(!showEdit);
              }}
            >
              <MdModeEditOutline /> Edit
            </button>
          </div>
        </div>
      )}
      <div className={styles.projectWrap}>
        {/** 📸 SCREENSHOTs */}
        <div className={styles.screenshotWrap}>
          <article className={styles.screenshotHolder}>
            <div className={styles.imageCycler}>
              <div className="flex">
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
              </div>
              {project?.screenshots && (
                <Image
                  className={styles.screenshot}
                  width={200}
                  height={140}
                  src={project?.screenshots[currentScreenshot]}
                  alt="Screenshot"
                />
              )}
            </div>
          </article>
        </div>
        {/** Map the information */}
        <div className={styles.infoWrap}>
          {showEdit ? (
            <input
              defaultValue={project.title}
              className={`${styles.name}  !place-self-start bg-black bg-opacity-10 focus:outline-none border border-b-0 border-white border-opacity-50 rounded-b-none rounded-md p-1 px-4`}
            />
          ) : (
            <h3 className={styles.name}>{project?.title}</h3>
          )}
          {showEdit ? (
            <textarea
              defaultValue={project.description}
              className={`${styles.description} h-[100px] min-h-24 w-[100%] bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
            />
          ) : (
            <p className={styles.description}>{project?.description}</p>
          )}

          {showEditStack && (
            <ul className="mb-6 flex flex-wrap gap-2 border rounded-lg p-4">
              {skills.map((skill) => (
                <li
                  className="flex gap-2 border rounded-full w-fit p-2 px-4"
                  key={skill.id}
                >
                  <input
                    type="checkbox"
                    value={skill.text}
                    onChange={() => {}}
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
                </li>
              ))}
            </ul>
          )}

          <div className={styles.btnWrap}>
            <button
              className={styles.btn}
              onClick={() => setShowMoreInfo(!showMoreInfo)}
            >
              {showMoreInfo ? "Hide Info" : "More Info👇"}
            </button>

            <a href={project.demoUrl} target="_blank" rel="noreferrer">
              <button className={styles.btn}>Demo👀</button>
            </a>
          </div>
          {showEdit && (
            <input
              className={`mt-2 mb-6 bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
              value={demoUrl || " https://"}
              onChange={(e) => handleUrlChange(e, setDemoUrl)}
              placeholder="Demo Url"
            />
          )}
          {showMoreInfo && (
            <div>
              {showEdit ? (
                <textarea
                  defaultValue={project.description}
                  className={`${styles.description} h-[200px] min-h-24 w-full bg-black bg-opacity-10 focus:outline-none border border-white border-opacity-50 rounded-md p-1 px-4`}
                />
              ) : (
                <p className={styles.moreInfo}>{project.moreInfo}</p>
              )}
            </div>
          )}
        </div>
        {showEdit && (
          <button
            className="absolute left-4 bottom-12 btn btn-round btn-ghost"
            onClick={() => {
              setShowEditStack(!showEditStack);
            }}
          >
            <MdModeEditOutline />
          </button>
        )}
        <ul className={styles.stackWrap}>
          {/** Map the stack */}
          {project?.stack.map((skill) => (
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
    </li>
  );
};

export default ProjectCard;
