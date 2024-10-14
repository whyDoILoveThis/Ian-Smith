import Header from "@/components/main/Header";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import { SignInButton } from "@clerk/nextjs";
import Image from "next/image";

export default function Home() {
  return (
    <article className=" p-4">
      <div className="w-full col-flex items-center">
        <Header />
      </div>
      <Skills />
      <Projects />
      <SignInButton mode="modal" />
    </article>
  );
}
