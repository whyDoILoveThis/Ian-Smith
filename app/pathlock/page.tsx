// app/page.tsx
"use client";

import DishView from "../../components/PathLock/DishView";
import Controls from "../../components/PathLock/Controls";
import OverlapView from "../../components/PathLock/OverlapView";
import DishRFField from "../../components/PathLock/DishRFField";
import { useDishState } from "../../components/PathLock/useDishState";
import {
  computeSignal,
  pointingRFfromTo,
  RFFieldAtPoint,
  gainToAppDb,
} from "../../components/PathLock/rfEngine";
import OverlapTopView from "@/components/PathLock/OverlapTopView";

export default function Page() {
  const dish1 = useDishState({
    azimuth: 0,
    tilt: 90,
    position: { x: 0, y: 0, z: 30 },
  });
  const dish2 = useDishState({
    azimuth: 180,
    tilt: 90,
    position: { x: 1500, y: 0, z: 28 },
  }); // 1.5 km east

  const TARGET_DB = 1.32; // Example target dB value
  const NULL_DB = 1.7; // Example null dB value
  const db = computeSignal(dish1.dish, dish2.dish);
  // per-dish readings (A reading B, B reading A)
  const offAtoB = pointingRFfromTo(dish1.dish, dish2.dish);
  const offBtoA = pointingRFfromTo(dish2.dish, dish1.dish);
  const gA = RFFieldAtPoint(offAtoB);
  const gB = RFFieldAtPoint(offBtoA);
  const dbA = gainToAppDb(gA);
  const dbB = gainToAppDb(gB);

  return (
    <main
      style={{
        padding: 24,
        color: "#ddd",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 12 }}>📡 Microwave Pathing — Simulator</h1>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ width: 320 }}>
          <DishRFField dish={dish1.dish} title="Dish One RF" />
          <DishView title="Dish One (Mechanical)" dish={dish1.dish} />
          <Controls
            az={dish1.dish.azimuth}
            tilt={dish1.dish.tilt}
            setAz={dish1.setAz}
            setTilt={dish1.setTilt}
          />
        </div>

        <div style={{ width: 320 }}>
          <DishRFField dish={dish2.dish} title="Dish Two RF" />
          <DishView title="Dish Two (Mechanical)" dish={dish2.dish} />
          <Controls
            az={dish2.dish.azimuth}
            tilt={dish2.dish.tilt}
            setAz={dish2.setAz}
            setTilt={dish2.setTilt}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>📊 Live: {db.toFixed(3)} dB</h3>
            <div style={{ color: "#aaa", fontSize: 12 }}>
              Target: {TARGET_DB} dB • Null: {NULL_DB} dB
            </div>
            <div style={{ color: "#caa", fontSize: 13, marginTop: 6 }}>
              A→B: {dbA.toFixed(3)} dB • B→A: {dbB.toFixed(3)} dB
            </div>
          </div>

          <OverlapView dishA={dish1.dish} dishB={dish2.dish} />
          <OverlapTopView dishA={dish1.dish} dishB={dish2.dish} />
        </div>
      </div>
    </main>
  );
}
