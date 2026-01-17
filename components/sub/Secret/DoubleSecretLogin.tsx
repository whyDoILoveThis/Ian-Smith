// DoubleSecretLogin.tsx
"use client";

import { SignInButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSecretUnlock } from "@/components/sub/Secret/useSecretLogin"; // adjust the path if needed
import DownloadIcon from "../DownloadIcon";

export default function DoubleSecretLogin() {
  const rightPortal = useSecretUnlock(false); // first to unlock
  const leftPortal = useSecretUnlock(true); // locked at start
  const [showModal, setShowModal] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // 🔓 Unlock left when right is fully unlocked
  useEffect(() => {
    if (rightPortal.unlocked) {
      leftPortal.setLocked(false);
    }
  }, [rightPortal.unlocked, leftPortal]);

  const renderStage = (stage: number) => {
    return (
      <em className={` select-none`}>{leftPortal.stage === 3 ? 6 : stage}</em>
    );
  };

  // helper to compute CSS for pulse intensity
  const pulseStyle = (progress: number) => {
    // progress goes 0..1; scale between 1 and 1.6, glow between 0 and 12px
    const scale = 1 + progress * 0.6;
    const blur = 4 + progress * 12;
    const opacity = 0.6 + progress * 0.4;
    return {
      transform: `scale(${scale})`,
      boxShadow: `0 0 ${blur}px rgba(59,130,246,${opacity})`,
    } as React.CSSProperties;
  };

  return (
    <>
      {/* 🔐 Top-Right Trigger (tiny clickable area) */}
      <div
        onClick={rightPortal.trigger}
        className="absolute top-0 right-0 w-[10px] h-[10px] bg-transparent z-50"
      />
      {rightPortal.stage > 0 && (
        <p className={`absolute -top-20 ${leftPortal.stage === 3 && "six-3"}`}>
          {renderStage(rightPortal.stage)}
        </p>
      )}

      {/* Show right-portal pulse indicator near top-right when a countdown is active */}
      {rightPortal.countdownSeconds > 2 && (
        <div
          className="absolute top-4 right-6 flex items-center gap-2 z-50 select-none"
          title={`${rightPortal.countdownSeconds}s`}
        >
          <div
            className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"
            style={pulseStyle(rightPortal.countdownProgress)}
          />
          <div className="text-xs text-slate-300 tabular-nums">
            {rightPortal.countdownSeconds}
          </div>
        </div>
      )}

      {/* 🔒 Bottom-Left Trigger */}
      {rightPortal.isVisible && (
        <>
          <div
            onClick={leftPortal.trigger}
            className="absolute bottom-0 left-0 w-[10px] h-[10px] bg-transparent z-50"
          />
          {leftPortal.stage > 0 && (
            <div className="absolute -top-8 col-flex">
              <em className={`${leftPortal.stage === 3 && "six-1"}`}>
                {renderStage(leftPortal.stage)}
              </em>
              {leftPortal.stage === 3 && (
                <em className="absolute top-12 select-none six-2">6</em>
              )}
            </div>
          )}
        </>
      )}

      {/* Show left-portal pulse indicator near bottom-left when a countdown is active */}
      {leftPortal.countdownSeconds > 2 && (
        <div
          className="absolute bottom-24 left-6 flex items-center gap-2 z-[9999] select-none"
          title={`${leftPortal.countdownSeconds}s`}
        >
          <div
            className="w-3 h-3 rounded-full bg-red-400 animate-pulse"
            style={pulseStyle(leftPortal.countdownProgress)}
          />
          <div className="text-xs text-slate-300 tabular-nums">
            {leftPortal.countdownSeconds}
          </div>
        </div>
      )}

      {leftPortal.isVisible && (
        <div className="fixed bottom-3 left-3 z-[9999] bg-slate-800 w-[280px] p-2 rounded-lg shadow-md flex flex-col gap-2 items-center select-none">
          <div>
            <span
              onClick={() => {
                setShowModal(true);
              }}
              className="btn btn-red btn-squish btn-sm"
            >
              Suspicious Button
            </span>
          </div>
          <button
            className="btn btn-green btn-squish"
            onClick={() => {
              leftPortal.reset();
              rightPortal.reset();
            }}
          >
            ❌ close
          </button>
          <p className="text-xs text-gray-500 select-none">
            (close and forget this ever happened)
          </p>
        </div>
      )}
      {showModal && (
        <div
          className={`fixed inset-0 ${
            !showSignIn ? "zz-top-plus3" : "z-[0]"
          } pt-56 bg-slate-950 bg-opacity-70 backdrop-blur-sm `}
        >
          <p className="text-center mt-2 text-sm text-slate-300">
            You could literally be installing malware or viruses, do you REALLY
            wish to proceed?
          </p>
          <div className="col-flex gap-2 p-2 items-center">
            <button
              onClick={() => {
                setShowDownload(false);
                setShowModal(false);
                rightPortal.reset();
                leftPortal.reset();
              }}
              className="btn btn-green font-bold text-2xl mb-5"
            >
              👈Back to Safety
            </button>
            {!showDownload ? (
              <button
                onClick={() => {
                  setShowDownload(true);
                }}
                className="relative btn btn-red btn-squish"
              >
                Potentially Download Harmful/Dangerous Files
              </button>
            ) : (
              <a
                href="/files.zip"
                download
                className="relative flex justify-center items-center btn btn-red"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSignIn(!showSignIn);
                }}
              >
                <span className="absolute">
                  <DownloadIcon />
                </span>
                <span className="opacity-0">
                  <SignInButton mode="modal" />
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
