import SoftwarePage from "@/components/main/CppAppPage";
import RetroSoftwarePage from "@/components/main/CppAppPage";
import CppAppPage from "@/components/main/CppAppPage";
import React from "react";

const Cpp = () => {
  return (
    <div>
      <SoftwarePage
        title="CapsCooler"
        description="A small utility that automatically disables Caps Lock after a timer."
        downloadLink="/downloads/capscooler.zip"
        screenshot="/images/capscooler.png"
        theme="xp"
        features={[
          "Auto-disable Caps Lock",
          "Custom timer settings",
          "Runs silently in tray",
          "Tiny memory footprint",
        ]}
      />
    </div>
  );
};

export default Cpp;
