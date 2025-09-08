"use client";

import { useEffect, useState } from "react";

export default function ItsThreeDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500); // change speed here (500ms = half second)
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}
