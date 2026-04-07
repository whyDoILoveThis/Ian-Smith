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
import LivingLine from "@/components/sub/LivingLine";
import {
  WaterSortShowcaseCard,
  TimelineShowcaseCard,
  ItsQuizMeShowcaseCard,
  IconCreatorShowcaseCard,
  PerformanceOverlayShowcaseCard,
} from "@/components/main/ShowcaseInstances";
import MostRecentProjects from "@/components/main/showcase-visuals/MostRecentProjects";

export default function Home() {
  const [showBot, setShowBot] = useState(false);

  useRefreshOnReconnect();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <article className={`w-full col-flex items-center`}>
      {!showBot && <Nav />}
      <div className="w-full col-flex items-center mb-6">
        <Header />
      </div>
      <Skills />
      <div className="w-full mt-10 px-4">
        <ConfettiCelebration />
      </div>
      <SectionHeading title="Most Recent Projects" />
      <MostRecentProjects />
      <SectionHeading title="My Older Projects" />
      <Projects />
      <div className="h-6" />
      {/* FIXED POSITIONS 👇*/}
      <BotBtn showBot={showBot} setShowBot={setShowBot} />
      {showBot && <ItsBot show={showBot} setShow={setShowBot} />}
      <NetworkSpeedMini />
      <Footer />
    </article>
  );
}

const SectionHeading = ({ title }: { title: string }) => {
  return (
    <>
      <h2 className="text-center text-4xl md:text-5xl font-extrabold mt-24 mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
        {title}
      </h2>
      <LivingLine className="mb-12" />
    </>
  );
};
