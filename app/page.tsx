"use client";
import Header from "@/components/main/Header";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";

export default function Home() {
  return (
    <article className="pt-16">
      <Nav />
      <div className="w-full col-flex items-center">
        <Header />
      </div>
      <div className="mt-10">
        <Skills />
      </div>
      <Projects />
    </article>
  );
}
