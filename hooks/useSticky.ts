"use client";

import { useState, useEffect, useRef } from "react";

export function useSticky() {
  const [isStuck, setIsStuck] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    // Only run on the client side where the `window` object exists.
    if (typeof window === "undefined" || !elementRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `entry.intersectionRatio < 1` means the element is no longer fully in view,
        // which indicates it is in its "stuck" position.
        setIsStuck(entry.intersectionRatio < 1);
      },
      {
        // Use a threshold of 1.0 to detect when the element is 100% visible.
        threshold: [1.0],
      }
    );

    // Start observing the element.
    observer.observe(elementRef.current);

    // Clean up the observer on component unmount.
    return () => {
      observer.disconnect();
    };
  }, []); // The empty dependency array ensures this effect runs only once.

  return { elementRef, isStuck };
}
