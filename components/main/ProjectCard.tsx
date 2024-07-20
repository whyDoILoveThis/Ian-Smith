import Image from "next/image";
import styles from "../../styles/ProjectCard.module.css";
import chevron from "../../images/icon--chevron.png";
import mongo from "../../images/icon--mongodb.png";
import firebase from "../../images/icon--firebase.png";
import appwrite from "../../images/icon--appwrite.png";
import gitshot from "../../images/gitbash.png";
import react from "../../images/icon--react.png";

const ProjectCard = () => {
  const stack = [mongo, firebase, appwrite, react];

  return (
    <div className={styles.projects}>
      <li className={styles.projectWrap}>
        {/** 📸 SCREENSHOTs */}
        <div className={styles.screenshotWrap}>
          <article className={styles.screenshotHolder}>
            <div className={styles.imageCycler}>
              <div className="flex">
                <button className={[styles.btnArrow, styles.btnLeft].join(" ")}>
                  <Image src={chevron} alt="left" />
                </button>
                <button
                  className={[styles.btnArrow, styles.btnRight].join(" ")}
                >
                  <Image src={chevron} alt="right" />
                </button>
              </div>

              <Image className={styles.screenshot} src={gitshot} alt="right" />
            </div>
          </article>
        </div>
        {/** Map the information */}
        <div className={styles.infoWrap}>
          <h3 className={styles.name}>My Fitness</h3>
          <p className={styles.description}>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nesciunt
            officia temporibus non minima quos blanditiis. Impedit adipisci
            optio sunt corporis.
          </p>
          <div className={styles.btnWrap}>
            <button className={styles.btn}>More Info👇</button>
            <a
              href="https://its-git-bash.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              <button className={styles.btn}>Demo👀</button>
            </a>
          </div>
        </div>
        <ul className={styles.stackWrap}>
          {/** Map the stack */}
          {stack.map((icon, stackIndex) => (
            <li className={styles.stackItem} key={stackIndex}>
              <Image className={styles.stackIcon} src={icon} alt="stack icon" />
            </li>
          ))}
        </ul>
      </li>
    </div>
  );
};

export default ProjectCard;
