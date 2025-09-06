"use client";

import ItsToast from "@/components/sub/ItsToast";
import { useEffect, useRef, useState } from "react";
import { BsRobot, BsGear } from "react-icons/bs";
import { HINTS } from "@/lib/globals";
import ItsDropdown from "@/components/ui/its-dropdown";

type Props = {
  showBot: boolean;
  setShowBot: (show: boolean) => void;
};

export default function BotBtn({ showBot, setShowBot }: Props) {
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [disableHints, setDisableHints] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastDisabled, setToastDisabled] = useState(false);
  const [hovered, setHovered] = useState(false);

  const hintCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHintRef = useRef<string | null>(null);

  // helper: pick random hint instantly from local array
  const pickRandomHint = () => {
    if (!HINTS || HINTS.length === 0) return null;
    return HINTS[Math.floor(Math.random() * HINTS.length)];
  };

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem("disableHints");
    if (saved === "true") setDisableHints(true);
  }, []);

  // Save state and hide toast
  const saveDisableHints = (value: boolean) => {
    setDisableHints(value);
    localStorage.setItem("disableHints", value ? "true" : "false");
    setToastVisible(false);
  };

  // "fetch" now synchronous from local array
  const fetchHint = async () => {
    if (disableHints) return;
    // set pending hint synchronously
    pendingHintRef.current = pickRandomHint();
  };

  const resetInterval = () => {
    if (disableHints) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!showBot && !disableHints) {
        fetchHint();
        showPendingHint();
      }
    }, 30000);
  };

  const showPendingHint = () => {
    if (!pendingHintRef.current || showHint || disableHints) return;

    setHint(pendingHintRef.current);
    setShowHint(true);
    pendingHintRef.current = null;

    hintCountRef.current += 1;
    if (hintCountRef.current >= 4 && !toastVisible && !toastDisabled) {
      setToastVisible(true);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowHint(false), 5000);

    resetInterval();
  };

  useEffect(() => {
    if (disableHints) return;

    // initial small delay to avoid double flash
    const initialTimeout = setTimeout(() => {
      if (!showBot) {
        fetchHint();
        showPendingHint();
      }
    }, 300);

    resetInterval();

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHover = () => {
    setHovered(true);
    if (!showHint && !disableHints) {
      // immediate local pick + show
      fetchHint();
      showPendingHint();
      // reset interval so hover doesn't get interrupted
      resetInterval();
    }
  };

  const handleHoverLeave = () => {
    setHovered(false);
  };

  const disableInfiniteHints = () => {
    saveDisableHints(true);
    setToastVisible(false);
  };

  return (
    <>
      <div
        className="fixed bottom-2 right-2 flex items-center gap-2 z-50"
        onMouseEnter={handleHover}
        onMouseLeave={handleHoverLeave}
      >
        <button
          className={`${
            showHint && !disableHints ? "w-auto px-3 pr-3" : "w-12"
          } h-12 backdrop-blur-md rounded-full flex justify-center items-center p-0 border border-opacity-50 border-white text-white bg-[#0080ffeb] transition-all duration-500`}
        >
          <span
            onClick={() => setShowBot(!showBot)}
            className="flex items-center"
          >
            <BsRobot size={30} />
            {!disableHints && (
              <span
                className={`text-sm font-semibold transition-all duration-500 overflow-hidden ${
                  showHint ? "w-fit ml-2" : "max-w-0 p-0 m-0"
                }`}
              >
                {hint}
              </span>
            )}
          </span>
          {/* Settings gear (shows on hover) */}
        </button>

        <ItsDropdown
          className="-translate-x-72"
          position="up-left"
          trigger={
            <button className="w-full">
              <BsGear size={18} />
            </button>
          }
        >
          <button
            className=" z-50 btn btn-ghost"
            onClick={() => saveDisableHints(!disableHints)}
            aria-label="Toggle hints"
          >
            Turn Hints {disableHints ? "On" : "Off"}
          </button>
        </ItsDropdown>
      </div>

      {/* Toast */}
      {toastVisible && !disableHints && !toastDisabled && (
        <ItsToast delay={10000} onClose={() => setToastVisible(false)}>
          <div className="flex items-center gap-4 p-2 pt-6">
            <span>You’ve seen several hints. Disable infinite hints?</span>
            <div className="flex flex-col items-center gap-2">
              <button
                className="btn btn-purple btn-sm btn-squish"
                onClick={() => {
                  setToastVisible(false);
                  setToastDisabled(true);
                }}
              >
                No I like the hints
              </button>
              <button onClick={disableInfiniteHints} className="btn btn-blue">
                Disable
              </button>
            </div>
          </div>
        </ItsToast>
      )}
    </>
  );
}
