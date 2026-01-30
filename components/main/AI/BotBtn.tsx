"use client";

import ItsToast from "@/components/sub/ItsToast";
import { useEffect, useRef, useState } from "react";
import { BsRobot } from "react-icons/bs";
import { HINTS } from "@/lib/globals";
import ItsDropdown from "@/components/ui/its-dropdown";
import { Settings } from "lucide-react";

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

  useEffect(() => {
    const savedHints = localStorage.getItem("disableHints");
    if (savedHints === "true") setDisableHints(true);

    const savedToast = localStorage.getItem("toastDisabled");
    if (savedToast === "true") setToastDisabled(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("toastDisabled", toastDisabled ? "true" : "false");
  }, [toastDisabled]);

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
    setToastDisabled(true);
    setShowHint(false);
  };

  return (
    <>
      <div
        className="fixed bottom-2 right-2 flex items-center gap-2 z-50"
        onMouseEnter={handleHover}
        onMouseLeave={handleHoverLeave}
      >
        {(toastDisabled || disableHints) && (
          <ItsDropdown
            closeWhenItemClick
            className=" w-[150px] translate-y-2 !bg-white/20 backdrop-blur-md"
            position="up-right"
            trigger={
              <button className={`w-full text-gray-400 hover:text-white`}>
                <Settings size={14} />
              </button>
            }
          >
            <button
              className=" z-50 hover:bg-white/20 rounded-lg !w-full"
              onClick={() => saveDisableHints(!disableHints)}
              aria-label="Toggle hints"
            >
              Turn Hints {disableHints ? "On" : "Off"}
            </button>
          </ItsDropdown>
        )}
        <button
          onClick={() => setShowBot(!showBot)}
          className={`h-12 backdrop-blur-md rounded-full overflow-hidden flex items-center justify-center border border-opacity-50 border-white text-white bg-[#0080ffeb]
    transition-all duration-500 ease-in-out
    ${
      showHint && !disableHints
        ? "max-w-[24rem] px-4 animate-bounce-small"
        : "w-12 max-w-12 px-0"
    }`}
        >
          <BsRobot size={30} />

          {!disableHints && (
            <span
              className={`text-sm font-semibold overflow-hidden transition-all duration-500 ease-in-out
        ${
          showHint
            ? "pl-2 max-w-[20rem] opacity-100 translate-x-0"
            : "max-w-0 pl-0 opacity-0 -translate-x-2"
        }`}
            >
              {hint}
            </span>
          )}

          <style jsx global>{`
            @keyframes bounce-small {
              0% {
                transform: scale(1);
              }
              25% {
                transform: scale(1.15);
              }
              50% {
                transform: scale(0.95);
              }
              75% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
              }
            }

            .animate-bounce-small {
              animation: bounce-small 0.4s ease-in-out forwards;
            }
          `}</style>
        </button>
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
