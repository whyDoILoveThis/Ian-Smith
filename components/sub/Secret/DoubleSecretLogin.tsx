"use client";

import { SignInButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSecretUnlock } from "./useSecretLogin"; // make sure path is correct
import DownloadIcon from "../DownloadIcon";

export default function DoubleSecretLogin() {
  const rightPortal = useSecretUnlock(false); // first to unlock
  const leftPortal = useSecretUnlock(true); // locked at start
  const [showModal, setShowModal] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

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

  return (
    <>
      {/* 🔐 Top-Right Trigger */}
      <div
        onClick={rightPortal.trigger}
        className="absolute top-0 right-0 w-[10px] h-[10px] bg-white opacity-0 z-50"
      />
      {rightPortal.stage > 0 && (
        <p className={`absolute -top-20 ${leftPortal.stage === 3 && "six-3"}`}>
          {renderStage(rightPortal.stage)}
        </p>
      )}

      {/* 🔒 Bottom-Left Trigger */}
      {rightPortal.isVisible && (
        <>
          <div
            onClick={leftPortal.trigger}
            className="absolute bottom-0 left-0 w-[10px] h-[10px] bg-white opacity-0 z-50"
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
      {leftPortal.isVisible && (
        <div className="fixed bottom-3 left-3 z-[9999] bg-slate-800 w-[280px] p-2 rounded-lg shadow-md flex flex-col gap-2 items-center select-none">
          <div>
            <span
              onClick={() => {
                setShowModal(true);
              }}
              className="btn btn-red btn-squish btn-sm"
            >
              Suspicious Button 💀👹👺🤡
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
            &#40;close and forget this ever happened&#41;
          </p>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 bg-opacity-70 backdrop-blur-sm ">
          <p className="text-center mt-2 text-sm text-slate-300">
            You could literally be installing malware or viruses, do you REALLY
            wish to procede?
          </p>
          <div className="col-flex gap-2 p-2 items-center">
            <button
              onClick={() => {
                setShowDownload(false);
                setShowModal(false);
                rightPortal.reset();
                leftPortal.reset();
              }}
              className="btn btn-green btn-squish"
            >
              Back to Saftey
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
              <a href="/files.zip" download className="relative btn btn-red">
                <span className="w-fit h-fit z-[999999] opacity-0">
                  <SignInButton mode="modal" />
                </span>
                <p className="z-0 w-[20px] h-[20px] absolute top-2 right-4">
                  <DownloadIcon />
                </p>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
