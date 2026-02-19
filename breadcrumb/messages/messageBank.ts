// ─────────────────────────────────────────────────────────────
// breadcrumb/messages/messageBank.ts — Curated micro-copy by state
// ─────────────────────────────────────────────────────────────
//
// Hand-written messages mapped to inferred behavioral states.
// These serve as the default/fallback when no LLM API is available,
// and as a warm-start so messages appear quickly before an API
// round-trip completes.
//
// Each state maps to multiple messages so the same visitor
// doesn't see the same text twice across sessions.
//
// Tone: reflective, human, understated. Never salesy or creepy.
// ─────────────────────────────────────────────────────────────

const bank: Record<string, string[]> = {
  // ── Exploration & Navigation ────────────────────────────────

  "exploratory-browsing": [
    "Curiosity doesn't need a destination.",
    "Some of the best finds aren't what you were looking for.",
    "There's no wrong door here.",
    "Wandering is its own kind of progress.",
    "Every click is a quiet question.",
  ],

  "deep-focus": [
    "Something here held your attention. That's rare.",
    "Depth over speed — a good instinct.",
    "The details tend to reward patience.",
    "Staying with it says more than moving on.",
    "Not everything reveals itself on the first pass.",
  ],

  // ── Reading Posture ─────────────────────────────────────────

  "seeking-clarity": [
    "Clarity usually lives a little further down the page.",
    "The answer's often in the part most people skip.",
    "Reading all the way through is becoming a lost art.",
    "Some things only make sense after you've seen the whole picture.",
    "The scroll is the commit.",
  ],

  "scanning-evaluating": [
    "First impressions are just that — first.",
    "The surface tells one story. The details tell another.",
    "Quick reads still leave fingerprints.",
    "Skimming is just deciding what deserves a closer look.",
  ],

  "confirming-expectations": [
    "Looking for something specific has its own momentum.",
    "Sometimes you already know, you just need to see it.",
    "Validation is just curiosity with a deadline.",
  ],

  // ── Hesitation & Decision ───────────────────────────────────

  "weighing-options": [
    "Not clicking is still a decision.",
    "Hesitation and thoughtfulness look the same from the outside.",
    "Some things are worth sitting with.",
    "The pause before the action is where the real thinking happens.",
    "Every almost-click is a thought you didn't finish.",
  ],

  "careful-decisive": [
    "Deliberate choices leave better trails.",
    "Thinking before clicking — rare and underrated.",
    "Precision isn't slow. It's just quiet.",
  ],

  // ── Tempo & Urgency ─────────────────────────────────────────

  "high-urgency": [
    "Moving fast doesn't mean missing things.",
    "Speed has its own kind of clarity.",
    "You know what you're looking for. That's a head start.",
  ],

  "reflective-pace": [
    "No rush. The site's not going anywhere.",
    "Slow visits tend to be the ones that stick.",
    "There's something nice about taking your time.",
    "The unhurried ones usually notice the most.",
  ],

  // ── Return Visits ───────────────────────────────────────────

  "reconsidering": [
    "Some things take a second look before they make sense.",
    "Coming back says something words don't.",
    "Second visits are where opinions actually form.",
    "Still thinking about it. That's a signal.",
  ],

  "ongoing-interest": [
    "Still here. That says something.",
    "Repeated visits have a quiet sincerity to them.",
    "Familiarity is just attention compounded.",
  ],

  // ── Time of Day ─────────────────────────────────────────────

  "late-night-contemplation": [
    "The best thinking happens when the world gets quiet.",
    "Late nights and open tabs — a familiar combination.",
    "Sometimes the best decisions happen after midnight.",
    "Night hours have a way of making things feel more honest.",
  ],

  "personal-time-browsing": [
    "Weekend browsing has a different texture.",
    "Not every visit needs a reason.",
    "Personal time, personal pace.",
  ],

  // ── Referral Context ────────────────────────────────────────

  "professional-evaluation": [
    "The work speaks louder than the profile.",
    "Credentials tell you what someone learned. Projects tell you what they built.",
    "Portfolios are just proof in disguise.",
  ],

  "technical-evaluation": [
    "The code is the resume.",
    "Repos don't exaggerate.",
    "Every commit is a small promise kept.",
  ],

  "search-driven-discovery": [
    "Finding this wasn't an accident.",
    "Search led you here. Curiosity keeps you.",
    "Discovery is just attention plus timing.",
  ],

  "intentional-visit": [
    "Direct visits carry weight.",
    "Someone pointed you here. That's its own kind of endorsement.",
    "Typing the URL is a small act of intention.",
  ],

  // ── Micro-interaction derived states ────────────────────────

  "low-commitment-browse": [
    "No pressure. Just looking is allowed.",
    "Not every visit needs a purpose.",
    "Sometimes the detour is the destination.",
  ],

  "positive-resonance": [
    "Something clicked. Not just the mouse.",
    "When something fits, you feel it before you think it.",
    "That reaction? Worth trusting.",
  ],

  "high-engagement": [
    "That kind of energy is contagious.",
    "Excitement is just certainty arriving early.",
    "When it clicks, it clicks.",
  ],

  "curious-engaged": [
    "Curiosity rewarded, as it should be.",
    "The ones who click the small things notice the big ones.",
    "Poking around is just thoroughness in disguise.",
  ],

  "focused-ignoring-distractions": [
    "Focus like that is hard to come by.",
    "Knowing what to ignore is its own skill.",
    "Straight to the point. Respect.",
  ],

  "high-energy": [
    "That energy carries further than you think.",
    "Momentum like this is worth following.",
    "Steady and charged. Good combination.",
  ],

  "neutral-browsing": [
    "Not every moment needs to be a peak.",
    "Steady is its own kind of signal.",
    "The middle ground is where most decisions live.",
  ],

  "low-energy-browsing": [
    "Low energy visits sometimes find the most.",
    "Rest and browsing share more than you'd think.",
    "Quiet attention is still attention.",
  ],
};

/** Fallback messages when no state is inferred (or session just started) */
const fallbacks: string[] = [
  "Every visit tells a story.",
  "You're here. That's the first interesting thing.",
  "Take what resonates. Leave the rest.",
  "Not everything needs to be clicked to be understood.",
  "This moment is as good as any.",
];

/**
 * Select a message based on inferred states.
 * Picks from the highest-weighted state that has messages available,
 * using a seeded-random selection to avoid repetition within a session.
 */
export function selectMessage(
  inferredStates: { key: string; weight: number }[],
  sessionId: string
): string {
  // Simple seed from sessionId + current minute (changes message over time)
  const minuteSeed = Math.floor(Date.now() / 60000);
  const seed = hashCode(`${sessionId}-${minuteSeed}`);

  // Try states in order of weight (highest first)
  for (const state of inferredStates) {
    const messages = bank[state.key];
    if (messages && messages.length > 0) {
      const idx = Math.abs(seed) % messages.length;
      return messages[idx];
    }
  }

  // No matching state — use fallback
  const idx = Math.abs(seed) % fallbacks.length;
  return fallbacks[idx];
}

/** Simple string hash for deterministic-ish selection */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit int
  }
  return hash;
}
