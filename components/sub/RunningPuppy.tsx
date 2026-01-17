import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  motion,
  useSpring,
  useTransform,
  useMotionValue,
  animate,
  Variants,
} from "framer-motion";

/**
 * TYPE DEFINITIONS & SKELETAL INTERFACES
 */
interface PuppyJoint {
  x: number;
  y: number;
  angle: number;
}

interface PuppySkeleton {
  spine: PuppyJoint[];
  head: PuppyJoint;
  tail: PuppyJoint[];
  limbs: {
    frontLeft: PuppyJoint[];
    frontRight: PuppyJoint[];
    backLeft: PuppyJoint[];
    backRight: PuppyJoint[];
  };
}

interface BehaviorConfig {
  speed: number;
  bounce: number;
  stepHeight: number;
  tailAgitation: number;
  earFlop: number;
  spineFlex: number;
}

/**
 * PROCEDURAL CARTOON PUPPY - 2026 EDITION
 * A physics-heavy, background-locked component.
 */
const UltraRealisticCartoonPuppy: React.FC<{
  variation?: number;
  baseSize?: number;
  speedMultiplier?: number;
  frequency?: number;
  amplitude?: number;
}> = ({
  variation = 0,
  baseSize = 220,
  speedMultiplier = 1.0,
  frequency = 1.0,
  amplitude = 1.0,
}) => {
  // --- CORE STATE ENGINE ---
  type ActionState =
    | "IDLE"
    | "WALK"
    | "RUN"
    | "POUNCE"
    | "SNIFF"
    | "STRETCH"
    | "FLIP"
    | "ZOOMIES"
    | "SLEEP"
    | "WADDLE";
  const [state, setState] = useState<ActionState>("IDLE");
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- PHYSICS SPRINGS (The "Muscles") ---
  const worldX = useSpring(0, { stiffness: 30, damping: 20 });
  const worldY = useSpring(0, { stiffness: 150, damping: 25 });
  const bodyRotation = useSpring(0, { stiffness: 100, damping: 15 });
  const spineCurvature = useSpring(0, { stiffness: 80, damping: 10 });
  const neckAngle = useSpring(0, { stiffness: 120, damping: 20 });
  const tailWag = useSpring(0, { stiffness: 200, damping: 5 });

  // --- BEHAVIOR PARAMETERS ---
  const behaviors: Record<ActionState, BehaviorConfig> = useMemo(
    () => ({
      IDLE: {
        speed: 0,
        bounce: 2,
        stepHeight: 0,
        tailAgitation: 5,
        earFlop: 2,
        spineFlex: 0,
      },
      WALK: {
        speed: 2,
        bounce: 5,
        stepHeight: 12,
        tailAgitation: 15,
        earFlop: 10,
        spineFlex: 5,
      },
      RUN: {
        speed: 6,
        bounce: 15,
        stepHeight: 25,
        tailAgitation: 40,
        earFlop: 35,
        spineFlex: 15,
      },
      POUNCE: {
        speed: 4,
        bounce: 40,
        stepHeight: 30,
        tailAgitation: 60,
        earFlop: 50,
        spineFlex: 20,
      },
      SNIFF: {
        speed: 0.5,
        bounce: 1,
        stepHeight: 5,
        tailAgitation: 10,
        earFlop: 5,
        spineFlex: -10,
      },
      STRETCH: {
        speed: 0,
        bounce: 0,
        stepHeight: 0,
        tailAgitation: 2,
        earFlop: 0,
        spineFlex: 25,
      },
      FLIP: {
        speed: 2,
        bounce: 60,
        stepHeight: 10,
        tailAgitation: 100,
        earFlop: 80,
        spineFlex: 40,
      },
      ZOOMIES: {
        speed: 10,
        bounce: 20,
        stepHeight: 35,
        tailAgitation: 80,
        earFlop: 60,
        spineFlex: 20,
      },
      SLEEP: {
        speed: 0,
        bounce: 0.5,
        stepHeight: 0,
        tailAgitation: 0,
        earFlop: 0,
        spineFlex: 0,
      },
      WADDLE: {
        speed: 1.5,
        bounce: 8,
        stepHeight: 10,
        tailAgitation: 20,
        earFlop: 15,
        spineFlex: 10,
      },
    }),
    [],
  );

  // --- BRAIN LOGIC (State Machine) ---
  useEffect(() => {
    let brainTimer: ReturnType<typeof setTimeout>;

    const think = () => {
      const dice = Math.random();
      const possibleStates: ActionState[] = [
        "IDLE",
        "WALK",
        "RUN",
        "POUNCE",
        "SNIFF",
        "STRETCH",
        "ZOOMIES",
        "WADDLE",
      ];
      const nextState =
        possibleStates[Math.floor(Math.random() * possibleStates.length)];

      setState(nextState);

      if (nextState !== "IDLE" && nextState !== "SLEEP") {
        const moveDist = (Math.random() * 400 - 200) * speedMultiplier;
        setDirection(moveDist > 0 ? 1 : -1);
        worldX.set(worldX.get() + moveDist);
      }

      if (nextState === "FLIP") {
        bodyRotation.set(bodyRotation.get() + 360);
      }

      // Randomize thinking interval
      brainTimer = setTimeout(think, 1500 + Math.random() * 3000);
    };

    think();
    return () => clearTimeout(brainTimer);
  }, [speedMultiplier]);

  // --- PROCEDURAL ANIMATION CONSTANTS ---
  const puppyColor = "#FFFFFF";
  const spotColor = variation % 2 === 0 ? "#E0E0E0" : "#D2B48C";
  const lineWeight = 2.5;

  // --- COMPLEX SVG LAYERS ---
  const renderSpots = () => {
    const spots = [];
    for (let i = 0; i < (variation % 10) + 3; i++) {
      spots.push(
        <motion.ellipse
          key={i}
          cx={40 + i * 5}
          cy={50 + (i % 3) * 5}
          rx={3 + (i % 4)}
          ry={2 + (i % 3)}
          fill={spotColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
        />,
      );
    }
    return spots;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
        backgroundColor: "transparent",
      }}
    >
      <motion.div
        style={{
          x: worldX,
          y: worldY,
          rotate: bodyRotation,
          scaleX: direction,
          position: "absolute",
          bottom: "10%",
          left: "20%",
        }}
      >
        <svg
          width={baseSize}
          height={baseSize}
          viewBox="0 0 200 200"
          style={{
            overflow: "visible",
            filter: "drop-shadow(0px 10px 5px rgba(0,0,0,0.05))",
          }}
        >
          {/* SQUASH AND STRETCH SHADOW */}
          <motion.ellipse
            cx="100"
            cy="160"
            fill="black"
            initial={{ opacity: 0.1 }}
            animate={{
              rx: state === "IDLE" ? 40 : 55,
              ry: state === "IDLE" ? 8 : 4,
              opacity: state === "POUNCE" ? 0.05 : 0.12,
            }}
          />

          {/* BACK LIMBS (Rendered behind body) */}
          <Leg
            type="BACK"
            x={120}
            y={120}
            state={state}
            config={behaviors[state]}
            delay={0.2}
            freq={frequency}
            amp={amplitude}
          />
          <Leg
            type="BACK"
            x={80}
            y={120}
            state={state}
            config={behaviors[state]}
            delay={0.5}
            freq={frequency}
            amp={amplitude}
          />

          {/* MAIN TORSO (The Spine Chain) */}
          <motion.g
            animate={{
              scaleY: [1, 1 + behaviors[state].bounce / 100, 1],
              scaleX: [1, 1 - behaviors[state].bounce / 200, 1],
            }}
            transition={{ repeat: Infinity, duration: 0.5 / frequency }}
          >
            {/* PROCEDURAL BODY PATH */}
            <motion.path
              d="M60 130 C 60 100, 140 100, 140 130 C 140 155, 60 155, 60 130"
              fill={puppyColor}
              stroke="#333"
              strokeWidth={lineWeight}
              animate={{
                d:
                  state === "STRETCH"
                    ? "M50 140 C 50 110, 150 110, 150 140 C 150 160, 50 160, 50 140"
                    : "M60 130 C 60 100, 140 100, 140 130 C 140 155, 60 155, 60 130",
              }}
            />
            {renderSpots()}

            {/* TAIL (High-Frequency Wagging) */}
            <motion.path
              d="M140 130 Q 165 110 175 130"
              fill="none"
              stroke="#333"
              strokeWidth={lineWeight + 1}
              strokeLinecap="round"
              animate={{
                rotate: [
                  behaviors[state].tailAgitation,
                  -behaviors[state].tailAgitation,
                ],
                originX: "140px",
                originY: "130px",
              }}
              transition={{
                repeat: Infinity,
                duration: 0.15,
                repeatType: "reverse",
              }}
            />
          </motion.g>

          {/* FRONT LIMBS (Rendered in front) */}
          <Leg
            type="FRONT"
            x={110}
            y={135}
            state={state}
            config={behaviors[state]}
            delay={0}
            freq={frequency}
            amp={amplitude}
          />
          <Leg
            type="FRONT"
            x={75}
            y={135}
            state={state}
            config={behaviors[state]}
            delay={0.3}
            freq={frequency}
            amp={amplitude}
          />

          {/* HEAD UNIT (Neck + Face) */}
          <motion.g
            animate={{
              y: [0, -behaviors[state].bounce / 2, 0],
              rotate: state === "SNIFF" ? [0, 5, -5, 0] : 0,
            }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            {/* NECK */}
            <motion.path
              d="M75 115 Q 65 100 70 85"
              stroke={puppyColor}
              strokeWidth={15}
              strokeLinecap="round"
            />

            {/* EARS (Physics Flopping) */}
            <Ear
              x={55}
              y={65}
              side="LEFT"
              behavior={state}
              config={behaviors[state]}
            />
            <Ear
              x={95}
              y={65}
              side="RIGHT"
              behavior={state}
              config={behaviors[state]}
            />

            {/* HEAD SHAPE */}
            <circle
              cx="75"
              cy="75"
              r="28"
              fill={puppyColor}
              stroke="#333"
              strokeWidth={lineWeight}
            />

            {/* FACE DETAILS */}
            <Face state={state} />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
};

/**
 * LEG COMPONENT - Procedural Joint Calculations
 */
const Leg: React.FC<{
  type: "FRONT" | "BACK";
  x: number;
  y: number;
  state: string;
  config: BehaviorConfig;
  delay: number;
  freq: number;
  amp: number;
}> = ({ type, x, y, state, config, delay, freq, amp }) => {
  const isMoving = state !== "IDLE" && state !== "SLEEP" && state !== "STRETCH";

  // Upper rotation
  const upperRotate = isMoving ? [15, -35, 15] : [0, 2, 0];
  // Joint bend (The IK "Realism" fix)
  const kneeBend = isMoving ? [0, 45, 0] : [0, 0, 0];

  return (
    <motion.g
      style={{ originX: `${x}px`, originY: `${y}px` }}
      animate={{ rotate: upperRotate }}
      transition={{
        repeat: Infinity,
        duration: 0.6 / freq,
        delay,
        ease: "easeInOut",
      }}
    >
      {/* THIGH / UPPER ARM */}
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + 15}
        stroke="#333"
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* KNEE JOINT */}
      <motion.g
        style={{ originX: `${x}px`, originY: `${y + 15}px` }}
        animate={{ rotate: kneeBend }}
        transition={{ repeat: Infinity, duration: 0.6 / freq, delay }}
      >
        <line
          x1={x}
          y1={y + 15}
          x2={x}
          y2={y + 32}
          stroke="#333"
          strokeWidth={5}
          strokeLinecap="round"
        />
        {/* PAW */}
        <motion.circle
          cx={x}
          cy={y + 32}
          r={4.5}
          fill="#333"
          animate={{ scaleY: [1, 0.8, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      </motion.g>
    </motion.g>
  );
};

/**
 * EAR COMPONENT - Flop Physics
 */
const Ear: React.FC<{
  x: number;
  y: number;
  side: "LEFT" | "RIGHT";
  behavior: string;
  config: BehaviorConfig;
}> = ({ x, y, side, behavior, config }) => {
  const isLeft = side === "LEFT";
  return (
    <motion.path
      d={isLeft ? "M60 60 Q 40 45 45 85" : "M90 60 Q 110 45 105 85"}
      fill={behavior === "SLEEP" ? "#F0F0F0" : "white"}
      stroke="#333"
      strokeWidth={2}
      strokeLinecap="round"
      style={{ originX: isLeft ? "60px" : "90px", originY: "60px" }}
      animate={{
        rotate:
          behavior === "IDLE"
            ? [0, 5, -5, 0]
            : [config.earFlop, -config.earFlop, config.earFlop],
        scaleY: behavior === "RUN" ? 1.2 : 1,
      }}
      transition={{ repeat: Infinity, duration: 0.4 }}
    />
  );
};

/**
 * FACE COMPONENT - Micro-expressions and Blinking
 */
const Face: React.FC<{ state: string }> = ({ state }) => {
  return (
    <g>
      {/* EYES */}
      <motion.g>
        <motion.ellipse
          cx="65"
          cy="70"
          rx="3"
          ry="4.5"
          fill="#333"
          animate={{ scaleY: state === "SLEEP" ? 0.1 : [1, 1, 0.1, 1] }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            times: [0, 0.9, 0.95, 1],
          }}
        />
        <motion.ellipse
          cx="85"
          cy="70"
          rx="3"
          ry="4.5"
          fill="#333"
          animate={{ scaleY: state === "SLEEP" ? 0.1 : [1, 1, 0.1, 1] }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            times: [0, 0.9, 0.95, 1],
          }}
        />
      </motion.g>

      {/* NOSE */}
      <motion.path
        d="M72 78 L 78 78 L 75 83 Z"
        fill="#FF9AA2"
        animate={state === "SNIFF" ? { scale: 1.2, y: -1 } : { scale: 1 }}
      />

      {/* MOUTH / SNOWMAN PUZZLE */}
      <path
        d="M70 85 Q 75 90 80 85"
        fill="none"
        stroke="#333"
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* TONGUE (Only when running) */}
      {state === "RUN" || state === "ZOOMIES" ? (
        <motion.path
          d="M73 88 Q 75 98 77 88"
          fill="#FF3B3B"
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 0.1 }}
        />
      ) : null}
    </g>
  );
};

export default UltraRealisticCartoonPuppy;
