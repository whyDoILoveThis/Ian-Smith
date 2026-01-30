// components/timeline/TimelineHoverCard.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import TimelineHoverImageViewer from "./TimelineHoverImageViewer";
import ExpandIcon from "../sub/ExpandIcon";

export default function TimelineHoverCard({
  event,
  onHeightChange,
  onExpand,
}: {
  event?: TimelineNode;
  onHeightChange?: (height: number) => void;
  onExpand?: () => void;
}) {
  const [descriptionHover, setDescriptionHover] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    // Use ResizeObserver to detect when card size changes
    const resizeObserver = new ResizeObserver(() => {
      // Check position on next frame after resize
      requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        onHeightChange?.(rect.height);

        // Check if description is truncated
        if (descriptionRef.current) {
          const isTrunc =
            descriptionRef.current.scrollWidth >
            descriptionRef.current.clientWidth;
          setIsTruncated(isTrunc);
        }
      });
    });

    resizeObserver.observe(cardRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onHeightChange, event?.description]);

  // Also check truncation whenever descriptionHover changes (when switching between truncated/expanded views)
  useEffect(() => {
    if (!descriptionRef.current || descriptionHover) return;

    requestAnimationFrame(() => {
      if (descriptionRef.current) {
        const isTrunc =
          descriptionRef.current.scrollWidth >
          descriptionRef.current.clientWidth;
        setIsTruncated(isTrunc);
      }
    });
  }, [descriptionHover]);

  if (!event) return null;

  const images = event.images ?? [];
  const hasImages = images.length > 0;

  return (
    <div
      ref={cardRef}
      className="z-[60] bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl w-60"
    >
      {/* Image Display */}
      {hasImages && <TimelineHoverImageViewer images={images} />}

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-400">
          {new Date(event.dateMs).toLocaleString()}
        </div>
        {onExpand && (
          <button
            onClick={onExpand}
            className="text-cyan-400 hover:text-cyan-300 transition-colors p-1 hover:bg-neutral-800 rounded"
            title="Expand"
          >
            <ExpandIcon size={16} />
          </button>
        )}
      </div>
      <div className="font-semibold text-white mt-1 ">{event.title}</div>
      {event.description && (
        <div className="mt-1" onMouseLeave={() => setDescriptionHover(false)}>
          <div className="flex items-center">
            <div
              ref={descriptionRef}
              className={`text-sm text-neutral-300 leading-5 flex-1 min-w-0 transition-[max-height] duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
                descriptionHover
                  ? "max-h-[80px] overflow-y-auto customScroll customScrollActiveCyan whitespace-normal pr-1"
                  : "max-h-[20px] overflow-hidden whitespace-nowrap"
              }`}
            >
              {event.description}
            </div>

            {isTruncated && (
              <button
                type="button"
                onMouseEnter={() => setDescriptionHover(true)}
                className="shrink-0 mt-[2px] rounded px-1 py-1 hover:bg-cyan-500/10"
                aria-label="Expand description"
                title="Expand"
              >
                <span className="timeline-ellipsis" aria-hidden="true">
                  <span className="timeline-ellipsis-dot" />
                  <span className="timeline-ellipsis-dot" />
                  <span className="timeline-ellipsis-dot" />
                </span>
              </button>
            )}
          </div>
        </div>
      )}
      {event.link && (
        <a
          className="text-xs text-cyan-300 inline-block"
          href={event.link}
          target="_blank"
          rel="noreferrer"
        >
          Open link ↗
        </a>
      )}
    </div>
  );
}
