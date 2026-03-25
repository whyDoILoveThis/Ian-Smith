"use client";

import {
  type ReactNode,
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import "@/styles/ShowcaseAnimations.css";
import EmojiText from "@/components/ui/EmojiText";

/* ── Visibility context ──
   ONE IntersectionObserver per showcase replaces FM's internal IO
   *and* drives CSS pause + JS interval gating in child slots.
   Children call useShowcaseInView() / useShowcaseHasEntered() —
   zero additional observers.
*/
interface ShowcaseCtx {
  inView: boolean;
  hasEntered: boolean;
}
const ShowcaseInViewContext = createContext<ShowcaseCtx>({
  inView: true,
  hasEntered: true,
});
/** Live viewport visibility (toggles on/off). */
export function useShowcaseInView() {
  return useContext(ShowcaseInViewContext).inView;
}
/** True once the showcase has entered the viewport (sticky). */
export function useShowcaseHasEntered() {
  return useContext(ShowcaseInViewContext).hasEntered;
}

/* ── Framer Motion variants ──
   cardVariants : entrance animation driven by manual `animate` prop
                  instead of `whileInView`, so we share the single IO.
   ctaVariants  : whileHover / whileTap spring-feel interaction that CSS
                  :active cannot replicate (no deceleration curve, no
                  gesture-aware state machine).
*/
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

const ctaVariants = {
  hover: { scale: 1.04 },
  tap: { scale: 0.96 },
};

/* ── Feature badge descriptor ── */
export interface FeatureBadgeItem {
  icon: string;
  label: string;
}

/* ── Theme colors ── */
export interface ShowcaseTheme {
  /** CSS radial-gradient for the background glow (e.g. "radial-gradient(circle, #8B5CF6 0%, #EC4899 40%, transparent 70%)") */
  glowGradient: string;
  /** CSS background value for the top accent bar (gradient or solid) */
  accentBarBg: string;
  /** Tailwind classes for the category badge */
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  /** Tailwind shadow class for the card (e.g. "shadow-purple-500/5") */
  cardShadow: string;
  /** Tailwind gradient + hover classes for the CTA button bg */
  ctaBg: string;
  ctaText: string;
  /** Tailwind shadow + hover shadow + transition classes for the CTA button */
  ctaShadow: string;
}

/* ── Props ── */
export interface ShowcaseCardProps {
  categoryLabel: string;
  title: ReactNode;
  description: ReactNode;
  features: FeatureBadgeItem[];
  theme: ShowcaseTheme;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  techNote?: string;
  heroSlot?: ReactNode;
  backgroundSlot?: ReactNode;
  centerSlot?: ReactNode;
}

export default function ShowcaseCard({
  categoryLabel,
  title,
  description,
  features,
  theme,
  ctaLabel,
  ctaHref,
  onCtaClick,
  techNote,
  heroSlot,
  backgroundSlot,
  centerSlot,
}: ShowcaseCardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [inView, setInView] = useState(false);

  /* ONE IntersectionObserver per showcase.
     - First intersection → fires entrance animation (once).
     - Every intersection change → toggles inView for CSS pause + JS gating. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setInView(visible);
        if (visible && !hasEntered) setHasEntered(true);
      },
      { rootMargin: "-80px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasEntered]);

  return (
    <ShowcaseInViewContext.Provider value={{ inView, hasEntered }}>
      <section
        ref={sectionRef}
        className={`relative w-full max-w-5xl mx-auto px-4${inView ? "" : " sc-offscreen"}`}
      >
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
            style={{ background: theme.glowGradient }}
          />
        </div>

        {/* Floating decorations slot */}
        {backgroundSlot && (
          <div className="absolute inset-0 -z-[5] overflow-hidden rounded-3xl pointer-events-none">
            {backgroundSlot}
          </div>
        )}

        {/* Card — ONE parent motion container per showcase */}
        <motion.div
          className={`relative rounded-sm border border-white/10
          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
           shadow-2xl ${theme.cardShadow}`}
          style={centerSlot ? { overflow: "visible" } : { overflow: "hidden" }}
          variants={cardVariants}
          initial="hidden"
          animate={hasEntered ? "visible" : "hidden"}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full z-0 rounded-t-3xl overflow-hidden"
            style={{ background: theme.accentBarBg }}
          />

          <div className="p-8 md:p-12 lg:p-16">
            {/* Header row */}
            <div
              className={`flex flex-col ${
                centerSlot
                  ? "md:flex-row md:items-start md:justify-between gap-6 mb-8"
                  : "lg:flex-row lg:items-start lg:justify-between gap-10 mb-10"
              }`}
            >
              {/* Left: text block */}
              <div className="max-w-md flex-shrink-0">
                <span
                  className={`inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                >
                  {categoryLabel}
                </span>
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight
                  bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent"
                >
                  {title}
                </h2>
                <p className="mt-4 text-base md:text-lg leading-relaxed text-white/50">
                  {description}
                </p>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2 mt-6">
                  {features.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10"
                    >
                      <span className={`text-base`}>
                        {f.icon === "👥" || f.icon === "✨" ? (
                          <span className="emoji-fallback">{f.icon}</span>
                        ) : (
                          <EmojiText>{f.icon}</EmojiText>
                        )}
                      </span>
                      <span className="text-sm font-medium text-white/70">
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: hero visual slot */}
              {heroSlot && (
                <div className="self-center lg:self-end flex-shrink-0">
                  {heroSlot}
                </div>
              )}
            </div>

            {/* Center slot (interactive demos, etc.) */}
            {centerSlot && <div className="w-full mb-8">{centerSlot}</div>}

            {/* Divider */}
            <hr
              className="w-full border-none h-px mb-8"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)",
              }}
            />

            {/* Footer: tech note + CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {techNote && <p className="text-sm text-white/30">{techNote}</p>}

              {onCtaClick ? (
                <motion.button
                  type="button"
                  onClick={onCtaClick}
                  className={`group relative px-8 py-3.5 rounded-2xl text-sm font-bold cursor-pointer ${theme.ctaBg} ${theme.ctaText} ${theme.ctaShadow}`}
                  variants={ctaVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span className="flex items-center gap-2">
                    {ctaLabel}
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </span>
                </motion.button>
              ) : ctaHref ? (
                <Link href={ctaHref}>
                  <motion.button
                    type="button"
                    className={`group relative px-8 py-3.5 rounded-2xl text-sm font-bold cursor-pointer ${theme.ctaBg} ${theme.ctaText} ${theme.ctaShadow}`}
                    variants={ctaVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <span className="flex items-center gap-2">
                      {ctaLabel}
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </span>
                  </motion.button>
                </Link>
              ) : null}
            </div>
          </div>
        </motion.div>
      </section>
    </ShowcaseInViewContext.Provider>
  );
}
