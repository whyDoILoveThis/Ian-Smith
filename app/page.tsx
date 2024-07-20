import Header from "@/components/main/Header";
import ProjectCard from "@/components/main/ProjectCard";
import Skills from "@/components/main/Skills";
import Image from "next/image";

export default function Home() {
  return (
    <article className="col-flex items-center">
      <Header />
      <Skills />
      <ProjectCard />
    </article>
  );
}
