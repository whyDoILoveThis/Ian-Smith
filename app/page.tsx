"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/AI/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useState } from "react";
import BotBtn from "@/components/main/AI/BotBtn";
import ConfettiCelebration from "@/components/main/ConfettiCelebration";
import useRefreshOnReconnect from "@/hooks/useRefreshOnReconnect";

export default function Home() {
  const [showBot, setShowBot] = useState(false);

  useRefreshOnReconnect();

  return (
    <article className="pt-16">
      <Nav />
      <div className="w-full col-flex items-center mb-6">
        <Header />
      </div>
      <div className="w-full px-4">
        <ConfettiCelebration />
      </div>
      <Skills />
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
