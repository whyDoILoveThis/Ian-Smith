"use client";
import Image from "next/image";
import styles from "../../styles/ProjectCard.module.css";
import chevron from "../../images/icon--chevron.png";
import { useState } from "react";

interface Props {
  project: Project;
  getSkillIcon: (skillText: string) => string;
  handleDelete?: (id: string | undefined) => Promise<void>;
}

const ProjectCard = ({ project, getSkillIcon, handleDelete }: Props) => {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showDeletePop, setShowDeletePop] = useState(false);

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
          <button
            className="btn btn-red font-bold text-red-600 text-outline"
            onClick={() => setShowDeletePop(true)}
          >
            ❌ Delete
          </button>
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
          <h3 className={styles.name}>{project?.title}</h3>
          <p className={styles.description}>{project?.description}</p>
          <div className={styles.btnWrap}>
            <button
              className={styles.btn}
              onClick={() => setShowMoreInfo(!showMoreInfo)}
            >
              {showMoreInfo ? "Hide Info" : "More Info👇"}
            </button>

            <a
              href="https://its-git-bash.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              <button className={styles.btn}>Demo👀</button>
            </a>
          </div>
          {showMoreInfo && (
            <p className={styles.moreInfo}>{project.moreInfo}</p>
          )}
        </div>
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
