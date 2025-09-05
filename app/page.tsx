"use client";
import Header from "@/components/main/Header";
import ItsBot from "@/components/main/ItsBot";
import Nav from "@/components/main/Nav";
import Projects from "@/components/main/Projects";
import Skills from "@/components/main/Skills";
import ItsPopover from "@/components/sub/ItsPopover";
import { useEffect, useState } from "react";
import { RiRobot2Line } from "react-icons/ri";

export default function Home() {
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showBot, setShowBot] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!showBot) {
        // only show when bot is hidden
        try {
          const res = await fetch("/api/ai-btn-txt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userMessages: [
                {
                  role: "user",
                  content: "Give me a short fun hint to try the bot.",
                },
              ],
            }),
          });

          const data = await res.json();
          setHint(data.reply || "Try me out!");
          setShowHint(true);

          // Hide hint again after 5 seconds
          setTimeout(() => setShowHint(false), 5000);
        } catch (err) {
          console.error("Hint fetch failed:", err);
        }
      }
    }, 30000); // every 30s

    return () => clearInterval(interval);
  }, [showBot]);

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
          className={`${
            showHint
              ? "w-fit px-2"
              : `
            w-12
            `
          }
          h-12
          z-50 
            backdrop-blur-md   
            rounded-full
            flex
            justify-center
            items-center
            p-0
            border
            border-opacity-50
            dark:border-white
            dark:text-white
            dark:bg-[#0080ffeb]
            dark:bg-opacity-100 
            fixed 
            bottom-2 
            right-2 
            overflow-hidden 
            transition-all 
            duration-500`}
          onClick={() => setShowBot(!showBot)}
        >
          <RiRobot2Line size={30} className="flex-shrink-0" />

          {/* Sliding hint text */}
          <span
            className={`text-sm whitespace-nowrap transition-all duration-500 ${
              showHint
                ? "max-w-[200px] opacity-100 ml-2"
                : "max-w-0 opacity-0 p-0 m-0"
            }`}
          >
            {hint}
          </span>
        </button>
      )}

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
