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
      <div className="w-full px-4">
        <ConfettiCelebration />
      </div>
      <Skills />
      <Projects />
      <WaterSortShowcase />
      <TimelineShowcase />
      <ItsQuizMeShowcase />
      <BotBtn showBot={showBot} setShowBot={setShowBot} />
      {showBot && (
        <ItsPopover
          closeWhenClicked={false}
          show={showBot}
          setShow={setShowBot}
        >
          <div className="w-full pr-4 h-full">
            <ItsBot show={showBot} setShow={setShowBot} />
          </div>
        </ItsPopover>
      )}
      <Footer />
    </article>
  );
}
