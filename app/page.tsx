"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/AI/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useState, useEffect } from "react";
import BotBtn from "@/components/main/AI/BotBtn";
import ConfettiCelebration from "@/components/main/ConfettiCelebration";
import useRefreshOnReconnect from "@/hooks/useRefreshOnReconnect";
import Footer from "@/components/main/Footer";
import PurpleParticleToggle from "@/components/main/PurpleParticleToggle";
import BrainfTodo from "@/components/sub/BrainfTodo";
import NetworkSpeedMini from "@/components/main/NetworkSpeedMini";
import WaterSortShowcase from "@/components/main/WaterSortShowcase";
import TimelineShowcase from "@/components/main/TimelineShowcase";
import ItsQuizMeShowcase from "@/components/main/ItsQuizMeShowcase";

export default function Home() {
  const [showBot, setShowBot] = useState(false);

  useRefreshOnReconnect();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <article
      className={`${!showBot ? "pt-20" : ""} w-full col-flex items-center`}
    >
      <NetworkSpeedMini />
      {!showBot && <Nav />}
      <div className="w-full col-flex items-center mb-6">
        <Header />
      </div>
      <Skills />
      <div className="w-full mt-10 px-4">
        <ConfettiCelebration />
      </div>
      <Projects />
      <>
        <h2 className="text-center text-4xl md:text-5xl font-extrabold mt-24 mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
          Most Recent Projects
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 via-blue-500 to-transparent rounded-full mb-20 mx-auto" />
        <WaterSortShowcase />
        <TimelineShowcase />
        <ItsQuizMeShowcase />
      </>
      <BotBtn showBot={showBot} setShowBot={setShowBot} />
      {showBot && <ItsBot show={showBot} setShow={setShowBot} />}
      <Footer />
    </article>
  );
}
