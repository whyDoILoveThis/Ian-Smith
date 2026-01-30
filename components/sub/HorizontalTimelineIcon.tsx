import React from "react";

const HorizontalTimelineIcon = ({
  width = 48,
  height = 24,
  color = "currentColor",
  strokeWidth = 2,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org"
      width={width}
      height={height}
      viewBox="0 0 48 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Horizontal main line */}
      <line x1="4" y1="12" x2="44" y2="12" />

      {/* Timeline nodes (circles) */}
      <circle cx="8" cy="12" r="3" fill={color} />
      <circle cx="24" cy="12" r="3" fill={color} />
      <circle cx="40" cy="12" r="3" fill={color} />

      {/* Optional: Indicator ticks or accents above/below nodes */}
      <line x1="24" y1="6" x2="24" y2="9" />
    </svg>
  );
};

export default HorizontalTimelineIcon;
