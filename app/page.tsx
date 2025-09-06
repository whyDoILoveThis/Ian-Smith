"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/AI/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useState } from "react";
import BotBtn from "@/components/main/AI/BotBtn";

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

      <BotBtn showBot={showBot} setShowBot={setShowBot} />

      {showBot && (
        <ItsPopover show={showBot} setShow={setShowBot}>
          <div className="w-full px-4 pr-8 h-full">
            <ItsBot show={showBot} setShow={setShowBot} />
          </div>
        </ItsPopover>
      )}
    </article>
  );
}
