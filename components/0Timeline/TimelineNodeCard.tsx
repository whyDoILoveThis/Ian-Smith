"use client";

import React, { useState } from "react";
import TimelineImageViewer from "./TimelineImageViewer";
import MenuIcon from "../sub/MenuIcon";
import LoaderSpinSmall from "../sub/LoaderSpinSmall";

type TimelineNodeCardProps = {
  event: TimelineNode;
  onEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  onClose?: () => void;
  canEdit?: boolean; // Whether the current user can edit this node
};

export default function TimelineNodeCard({
  event,
  onEdit,
  onDelete,
  isSaving,
  isDeleting,
  onClose,
  canEdit = true,
}: TimelineNodeCardProps) {
  const [openSidebar, setOpenSidebar] = useState(false);
  const images = event.images ?? [];
  const sidebarBtnClass =
    "w-full py-1 px-4 text-sm rounded-md transition-all duration-300 ease-in-out border disabled:opacity-50 disabled:cursor-not-allowed";
  const editBtnClass =
    "bg-neutral-800/60 border-neutral-700 hover:bg-neutral-700/80 text-neutral-300 hover:text-white";
  const deleteBtnClass =
    "bg-red-900/30 border-red-800/50 hover:bg-red-800/50 text-red-400 hover:text-red-300";

  return (
    <article
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="w-full relative flex rounded-2xl overflow-hidden border border-white/40 shadow-2xl max-w-[500px] h-full max-h-[375px]"
    >
      {onClose && (
        <button
          onClick={onClose}
          className="btn btn-round-sm btn-ghost text-xs absolute top-1 right-1 z-30 hover:btn-red transition-all duration-200"
          title="Close"
        >
          ✖
        </button>
      )}
      {/* Only show sidebar toggle if user can edit */}
      {canEdit && (
        <button
          onClick={() => {
            setOpenSidebar(!openSidebar);
          }}
          className={`btn btn-round-sm btn-ghost text-xs absolute top-1 z-30 transition-all duration-300 ${
            !openSidebar ? "left-1" : "left-[30.3%] btn-red"
          }`}
        >
          {openSidebar ? "✖" : <MenuIcon size={16} />}
        </button>
      )}
      {/**side bar - only render if canEdit */}
      {canEdit && (
        <aside
          className={`relative h-full flex flex-col gap-4 border-r border-white/40 transition-all duration-300 overflow-hidden bg-white/5 backdrop-blur-md ${
            openSidebar ? "w-[35%] p-4 pt-6" : "w-0 border-none p-0"
          }`}
        >
          <button
            onClick={onEdit}
            disabled={isSaving || isDeleting}
            className={`${sidebarBtnClass} ${editBtnClass}`}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={isSaving || isDeleting}
            className={`${sidebarBtnClass} ${deleteBtnClass}`}
          >
            {isDeleting ? <LoaderSpinSmall color="red" /> : "Delete"}
          </button>
        </aside>
      )}
      {/**main area of card */}
      <div
        className={`transition-all duration-300 p-4 bg-zinc-900/60 backdrop-blur-lg overflow-auto customScroll ${
          openSidebar ? "w-[65%]" : "w-full"
        }`}
      >
        <TimelineImageViewer images={images} />

        {/**title and description */}
        <div>
          <span className="font-bold text-lg block mb-1">{event.title}</span>
          <div className="text-sm text-neutral-300 mb-2">
            {event.description}
          </div>
        </div>

        {event.link && (
          <div className="flex flex-col mt-2">
            <span className="text-gray-500 text-xs">
              {"("}
              {event.link}
              {")"}
            </span>
            <a
              className="text-xs text-cyan-300 inline-block"
              href={event.link}
              target="_blank"
              rel="noreferrer"
            >
              Open link ↗
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
