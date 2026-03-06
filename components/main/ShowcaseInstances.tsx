"use client";

import ShowcaseCard from "@/components/main/ShowcaseCard";
import WaterSortHero from "@/components/main/showcase-visuals/WaterSortHero";
import IconCreatorHero from "@/components/main/showcase-visuals/IconCreatorHero";
import FloatingParticles from "@/components/main/showcase-visuals/FloatingParticles";

/* ═══════════════════════════════════════════════════════════
   Emoji / icon lists for floating backgrounds
   (verbatim from originals)
   ═══════════════════════════════════════════════════════════ */

const WATER_SORT_EMOJIS = [
  "🍎",
  "🍊",
  "🍋",
  "🥝",
  "🫐",
  "🍇",
  "🍑",
  "🍓",
  "🌹",
  "💎",
  "🦋",
  "🐸",
  "🍒",
  "🍉",
  "💜",
  "🧁",
];

const ICON_CREATOR_EMOJIS = [
  "🖼️",
  "🎨",
  "✂️",
  "📐",
  "🔲",
  "💎",
  "⬛",
  "🟧",
  "🪄",
  "🖌️",
  "📸",
  "🌟",
  "🔶",
  "✨",
  "🎯",
  "🗂️",
];

/* ═══════════════════════════════════════════════════════════
   1. WATER SORT SHOWCASE
   ═══════════════════════════════════════════════════════════ */

export function WaterSortShowcaseCard() {
  return (
    <ShowcaseCard
      categoryLabel="Featured Game"
      title="Emoji Sort"
      description={
        <>
          A colorful twist on the classic water-sort puzzle — sort emojis into
          matching tubes across{" "}
          <span className="text-white/70 font-semibold">
            30 hand-crafted levels
          </span>
          . Beautiful glass-tube physics, star ratings, and satisfying
          celebration particles on every win.
        </>
      }
      features={[
        { icon: "🧩", label: "30 Levels" },
        { icon: "⭐", label: "Star Ratings" },
        { icon: "🎉", label: "Celebrations" },
        { icon: "↩️", label: "Undo Support" },
      ]}
      theme={{
        glowGradient:
          "radial-gradient(circle, #8B5CF6 0%, #EC4899 40%, transparent 70%)",
        accentBarBg: "linear-gradient(to right, #a855f7, #ec4899, #f97316)",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-300",
        badgeBorder: "border-purple-500/30",
        cardShadow: "shadow-purple-500/5",
        ctaBg:
          "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400",
        ctaText: "text-white",
        ctaShadow:
          "shadow-xl shadow-purple-500/25 transition-shadow hover:shadow-purple-500/40",
      }}
      ctaLabel="Play Now"
      ctaHref="/watersort"
      techNote="Built with React, Framer Motion & SVG — fully responsive & mobile-friendly"
      heroSlot={<WaterSortHero />}
      backgroundSlot={
        <FloatingParticles
          emojis={WATER_SORT_EMOJIS}
          count={10}
          opacityRange={[0.2, 0.25]}
        />
      }
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   2. ICON CREATOR SHOWCASE
   ═══════════════════════════════════════════════════════════ */

export function IconCreatorShowcaseCard() {
  return (
    <ShowcaseCard
      categoryLabel="Featured Tool"
      title={
        <>
          Icon
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Creator
          </span>
        </>
      }
      description={
        <>
          Remove backgrounds from logos and generate{" "}
          <span className="text-white/70 font-semibold">
            multi-size .ICO files
          </span>{" "}
          — entirely in your browser. Smart flood-fill detection, adjustable
          tolerance, and instant transparent PNG exports. No uploads, no
          servers, no compromise.
        </>
      }
      features={[
        { icon: "🪄", label: "Auto BG Removal" },
        { icon: "🔒", label: "100% Private" },
        { icon: "⚡", label: "Instant" },
        { icon: "📦", label: "PNG + ICO" },
      ]}
      theme={{
        glowGradient:
          "radial-gradient(circle, #F97316 0%, #EF4444 40%, transparent 70%)",
        accentBarBg: "linear-gradient(to right, #f97316, #f59e0b, #eab308)",
        badgeBg: "bg-orange-500/20",
        badgeText: "text-orange-300",
        badgeBorder: "border-orange-500/30",
        cardShadow: "shadow-orange-500/5",
        ctaBg:
          "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400",
        ctaText: "text-white",
        ctaShadow:
          "shadow-xl shadow-orange-500/25 transition-shadow hover:shadow-orange-500/40",
      }}
      ctaLabel="Try It Now"
      ctaHref="/iconcreator"
      techNote="Built with Canvas API & TypeScript — client-side processing, zero dependencies"
      heroSlot={<IconCreatorHero />}
      backgroundSlot={
        <FloatingParticles
          emojis={ICON_CREATOR_EMOJIS}
          count={10}
          opacityRange={[0.15, 0.2]}
          rotation={180}
        />
      }
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   3. ITS QUIZ ME SHOWCASE
   (centerSlot with interactive demo will be wired separately;
    for now renders with text content only — matches layout)
   ═══════════════════════════════════════════════════════════ */

export function ItsQuizMeShowcaseCard() {
  return (
    <ShowcaseCard
      categoryLabel="AI-Powered"
      title="ItsQuizMe"
      description={
        <>
          Generate{" "}
          <span className="text-white/70 font-semibold">
            AI-powered quizzes
          </span>{" "}
          on any topic instantly. Features multiple question types,{" "}
          <span className="text-white/70 font-semibold">
            adaptive difficulty
          </span>
          , self-assessment mode, and detailed AI feedback on every answer.
        </>
      }
      features={[
        { icon: "🧠", label: "AI Generated" },
        { icon: "📝", label: "3 Question Types" },
        { icon: "🎯", label: "AI Grading" },
        { icon: "⚙️", label: "Customizable" },
      ]}
      theme={{
        glowGradient:
          "radial-gradient(circle, #8b5cf6 0%, #6366f1 40%, transparent 70%)",
        accentBarBg: "linear-gradient(to right, #a855f7, #3b82f6, #06b6d4)",
        badgeBg: "bg-purple-500/20",
        badgeText: "text-purple-300",
        badgeBorder: "border-purple-500/30",
        cardShadow: "shadow-purple-500/5",
        ctaBg:
          "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400",
        ctaText: "text-white",
        ctaShadow:
          "shadow-xl shadow-purple-500/25 transition-shadow hover:shadow-purple-500/40",
      }}
      ctaLabel="Try ItsQuizMe"
      ctaHref="/itsquizme"
      techNote="Built with React & AI — supports knowledge quizzes, self-assessments & opinion polls"
      backgroundSlot={
        <FloatingParticles
          dotColorRgb="139,92,246"
          count={12}
          distance={600}
          rotation={0}
        />
      }
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   4. TIMELINE SHOWCASE
   (centerSlot with real engine will be wired separately;
    for now renders with text content only — matches layout)
   ═══════════════════════════════════════════════════════════ */

export function TimelineShowcaseCard() {
  return (
    <ShowcaseCard
      categoryLabel="Featured Tool"
      title="Timeline Engine"
      description={
        <>
          A full-featured interactive timeline with{" "}
          <span className="text-white/70 font-semibold">
            pointer-lock panning
          </span>
          , zoom, drag &amp; drop events, and{" "}
          <span className="text-white/70 font-semibold">
            AI-powered timeline generation
          </span>
          . Create, share, and explore timelines with beautiful hover cards and
          node clustering.
        </>
      }
      features={[
        { icon: "🖱️", label: "Pan & Zoom" },
        { icon: "✨", label: "AI Generation" },
        { icon: "👥", label: "Multi-User" },
        { icon: "🖼️", label: "Image Nodes" },
      ]}
      theme={{
        glowGradient:
          "radial-gradient(circle, #06b6d4 0%, #3b82f6 40%, transparent 70%)",
        accentBarBg: "linear-gradient(to right, #06b6d4, #3b82f6, #6366f1)",
        badgeBg: "bg-cyan-500/20",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/30",
        cardShadow: "shadow-cyan-500/5",
        ctaBg:
          "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400",
        ctaText: "text-white",
        ctaShadow:
          "shadow-xl shadow-cyan-500/25 transition-shadow hover:shadow-cyan-500/40",
      }}
      ctaLabel="Explore Timeline"
      ctaHref="/timeline"
      techNote="Built with React, Framer Motion & Pointer Lock API — real-time persistence via Appwrite"
      backgroundSlot={
        <FloatingParticles
          dotColorRgb="6,182,212"
          count={12}
          distance={600}
          rotation={0}
        />
      }
    />
  );
}
