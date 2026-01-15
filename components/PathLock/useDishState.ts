// app/components/PathLock/useDishState.ts
"use client";

import { useState } from "react";
import { MechanicalState } from "./rfEngine";

export function useDishState(initial: MechanicalState) {
  const [dish, setDish] = useState<MechanicalState>(initial);

  const setAz = (v: number) => setDish((p) => ({ ...p, azimuth: ((v % 360) + 360) % 360 }));
  const setTilt = (v: number) => setDish((p) => ({ ...p, tilt: Math.max(0, Math.min(180, v)) }));

  const moveAz = (delta: number) => setAz(dish.azimuth + delta);
  const moveTilt = (delta: number) => setTilt(dish.tilt + delta);

  return { dish, setAz, setTilt, moveAz, moveTilt };
}
