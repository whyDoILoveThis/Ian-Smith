import LivingLine from "@/components/sub/LivingLine";
import React from "react";
import {
  IconCreatorShowcaseCard,
  ItsQuizMeShowcaseCard,
  PerformanceOverlayShowcaseCard,
  TimelineShowcaseCard,
  WaterSortShowcaseCard,
} from "../ShowcaseInstances";

const MostRecentProjects = () => {
  return (
    <>
      <div className="flex flex-col justify-center items-center gap-20">
        <WaterSortShowcaseCard />
        <TimelineShowcaseCard />
        <ItsQuizMeShowcaseCard />
        <IconCreatorShowcaseCard />
        <PerformanceOverlayShowcaseCard />
      </div>
    </>
  );
};

export default MostRecentProjects;
