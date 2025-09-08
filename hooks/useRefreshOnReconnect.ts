"use client";
import { useEffect } from "react";

export default function AutoRefreshOnReconnect() {
  useEffect(() => {
    const handleOnline = () => {
      console.log("Internet connection restored. Refreshing...");
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
