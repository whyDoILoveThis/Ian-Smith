"use client";
import Header from "@/components/main/Header";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";

export default function Home() {
  return (
    <article className=" p-4">
      <div className="w-full col-flex items-center">
        <Header />
      </div>
      <Skills />
      <Projects />
    </article>
  );
}
