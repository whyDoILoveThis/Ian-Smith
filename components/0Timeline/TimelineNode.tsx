// components/timeline/TimelineNode.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import TimelineHoverCard from "./TimelineHoverCard";
import TimelineCreateUI from "./TimelineCreateUI";
import TimelineNodeCard from "./TimelineNodeCard";
import ItsPopover from "../sub/ItsPopover";
import { ItsPortal0 } from "../sub/ItsPortal0";
import { appwrImgUp } from "@/appwrite/appwrStorage";

export default function TimelineNode({
  x,
  event,
  saveNode,
  deleteNode,
  getXForMs,
  containerWidth,
  showAllCards,
  canEdit,
  isPreview,
}: {
  x: number;
  event: TimelineNode;
  saveNode: (payload: TimelineNode) => Promise<TimelineNode>;
  deleteNode: (nodeId: string) => Promise<void>;
  getXForMs: (ms: number) => number;
  containerWidth: number;
  showAllCards?: boolean;
  canEdit?: boolean;
  isPreview?: boolean;
}) {
  const leftStyle: React.CSSProperties = { left: x };
  const [showNodeCard, setShowNodeCard] = useState(false);
  const [editAtMs, setEditAtMs] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lineHeight, setLineHeight] = useState(80);
  const [cardOffset, setCardOffset] = useState(88);
  const nodeRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Reset hover and pinned state when popover closes
  useEffect(() => {
    if (!showNodeCard) {
      setIsHovered(false);
      setIsPinned(false);
    }
  }, [showNodeCard]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 400);
  }, []);

  const calculateDynamicPositioning = useCallback((cardHeight: number) => {
    if (!nodeRef.current) return;

    // Hover card always renders ABOVE the timeline node.
    // So we only care about available space above the node in the viewport.
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const padding = 24; // keep a little space from the top edge
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;
    const spaceAbove = nodeCenterY - padding;

    const gap = 8; // space between line end and card
    const maxLine = 80;

    // Ensure the card can be pulled closer than before (lineHeight can go to 0).
    // We want: cardHeight + (lineHeight + gap) <= spaceAbove
    const desiredLine = spaceAbove - cardHeight - gap;
    const nextLineHeight = Math.max(0, Math.min(maxLine, desiredLine));

    setLineHeight(nextLineHeight);
    setCardOffset(nextLineHeight + gap);
  }, []);

  // Trigger positioning calculation when showAllCards mode activates
  useEffect(() => {
    if (showAllCards && nodeRef.current) {
      // Use a default estimated card height for initial positioning
      calculateDynamicPositioning(180);
    }
  }, [showAllCards, calculateDynamicPositioning]);

  const handleEdit = async (payload: TimelineNode) => {
    try {
      setIsSaving(true);
      let finalImages: Screenshot[] = event.images ?? [];

      // If new images were provided as File[], upload them first
      if (
        payload.images &&
        payload.images.length > 0 &&
        "lastModified" in payload.images[0]
      ) {
        finalImages = await Promise.all(
          (payload.images as any as File[]).map(async (file) => {
            const imgData = await appwrImgUp(file);
            return {
              url: imgData.url,
              fileId: imgData.fileId,
            } as Screenshot;
          }),
        );
      } else if (payload.images && payload.images.length > 0) {
        // Images are already Screenshot objects
        finalImages = payload.images;
      }

      const updatedNode: TimelineNode = {
        nodeId: event.nodeId,
        timelineId: event.timelineId,
        title: payload.title,
        description: payload.description,
        link: payload.link,
        dateMs: payload.dateMs,
        images: finalImages,
        color: payload.color ?? event.color,
      };

      await saveNode(updatedNode);
      setEditAtMs(null);
      setShowNodeCard(false);
    } catch (err) {
      console.error("Edit failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${event.title}"?`)) {
      try {
        setIsDeleting(true);
        await deleteNode(event.nodeId!);
        setShowNodeCard(false);
      } catch (err) {
        console.error("Delete failed:", err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const wrapperZIndex = isHovered
    ? 30000
    : isPinned || showNodeCard
      ? 20000
      : showAllCards
        ? 1000
        : 50;

  return (
    <div
      ref={nodeRef}
      style={{
        ...leftStyle,
        zIndex: wrapperZIndex,
      }}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex items-center justify-center">
        {/* vertical grow line */}
        <div
          className={`absolute h-0 transition-all duration-300 origin-bottom left-1/2 -translate-x-1/2 cursor-pointer ${
            showNodeCard
              ? "opacity-0 pointer-events-none"
              : showAllCards
                ? "opacity-60"
                : ""
          } ${isPreview ? "opacity-50" : ""}`}
          style={{
            height:
              (isHovered || showAllCards || isPinned) && !showNodeCard
                ? `${lineHeight}px`
                : 0,
            bottom: `calc(50% + 8px)`,
            width: showAllCards || isPinned ? "7px" : "2px",
            backgroundColor: isPreview ? "#f59e0b" : event.color || "#06b6d4",
          }}
          onMouseEnter={handleMouseEnter}
        />

        {/* top circle - hidden for preview nodes */}
        {!isPreview && (
          <div
            className={`absolute z-10 transition-all duration-200 cursor-pointer ${
              showNodeCard
                ? "opacity-0 pointer-events-none"
                : isHovered || showAllCards || isPinned
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
            }`}
            style={{
              bottom: `calc(50% + ${lineHeight}px)`,
            }}
            onMouseEnter={handleMouseEnter}
          >
            <div
              className="w-3 h-3 rounded-full border border-neutral-900 shadow-lg"
              style={{ backgroundColor: event.color || "#06b6d4" }}
            />
          </div>
        )}

        <ItsPortal0>
          <ItsPopover
            className="!bg-opacity-0  bg-black"
            bgBlur={"0"}
            show={showNodeCard}
            setShow={setShowNodeCard}
          >
            <TimelineNodeCard
              event={event}
              onEdit={() => setEditAtMs(event.dateMs)}
              onDelete={handleDelete}
              isSaving={isSaving}
              isDeleting={isDeleting}
              onClose={() => setShowNodeCard(false)}
              canEdit={canEdit}
            />
          </ItsPopover>
        </ItsPortal0>

        {/* main node dot */}
        <div
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsPinned(!isPinned)}
          className={`w-4 h-4 rounded-full cursor-pointer hover:scale-110 transform transition-all duration-200 shadow-lg ${
            showNodeCard ? "opacity-0 pointer-events-none" : ""
          } ${
            isPreview
              ? "ring-1 ring-neutral-700 opacity-60"
              : "ring-1 ring-neutral-700"
          }`}
          style={{ backgroundColor: event.color || "#06b6d4" }}
        />

        {/* hover card */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 origin-bottom transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
            showNodeCard
              ? "scale-y-95 opacity-0 pointer-events-none"
              : isHovered || showAllCards || isPinned
                ? "scale-y-100 opacity-100 pointer-events-auto"
                : "scale-y-95 opacity-0 pointer-events-none"
          }`}
          style={{
            bottom: `calc(50% + ${cardOffset}px)`,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <TimelineHoverCard
            event={event}
            onHeightChange={calculateDynamicPositioning}
            onExpand={() => setShowNodeCard(true)}
          />
        </div>

        {/* Edit UI Modal */}
        {editAtMs !== null && (
          <ItsPortal0>
            <TimelineCreateUI
              defaultDateMs={editAtMs}
              onClose={() => setEditAtMs(null)}
              onCreate={handleEdit}
              containerWidth={containerWidth}
              getXForMs={getXForMs}
              initialEvent={event}
              isLoading={isSaving}
            />
          </ItsPortal0>
        )}
      </div>
    </div>
  );
}
