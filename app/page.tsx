"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useState } from "react";
import { RiRobot2Line } from "react-icons/ri";

export default function Home() {
  const [showBot, setShowBot] = useState(false);

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
      {!showBot && (
        <button
          className={`z-50 backdrop-blur-md btn btn-bot fixed ${
            showBot ? "top-20" : "bottom-2"
          } right-2`}
          onClick={() => {
            setShowBot(!showBot);
          }}
        >
          <RiRobot2Line size={30} />
        </button>
      )}
      {showBot && (
        <ItsPopover show={showBot} setShow={setShowBot}>
          <ItsBot />
        </ItsPopover>
      )}
    </article>
  );
}
