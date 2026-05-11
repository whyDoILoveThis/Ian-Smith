export type Impact = "green" | "blue" | "yellow" | "red";

export interface Cheat {
  code: string;
  description: string;
  impact: Impact;
}

export interface CheatSection {
  id: string;
  title: string;
  emoji: string;
  cheats: Cheat[];
}

/**
 * Impact legend:
 *  green  – Pure benefit / no real downside (health, money, skills)
 *  blue   – Neutral / cosmetic / fun (weather, themes, spawns)
 *  yellow – Alters gameplay noticeably; may disable trophies
 *  red    – Disruptive / can permanently affect save or break missions
 */
export const SECTIONS: CheatSection[] = [
  {
    id: "player",
    title: "Player",
    emoji: "🧍",
    cheats: [
      { code: "HESOYAM", description: "Gives $250,000, full health, and full armor", impact: "green" },
      { code: "BAGUVIX", description: "Makes CJ almost invincible (still vulnerable to explosions/falls)", impact: "yellow" },
      { code: "CVWKXAM", description: "Infinite oxygen underwater", impact: "green" },
      { code: "AEDUWNV", description: "CJ never gets hungry", impact: "green" },
      { code: "BTCDBCB", description: "Makes CJ extremely fat", impact: "yellow" },
      { code: "KVGYZQK", description: "Makes CJ very skinny", impact: "yellow" },
      { code: "JYSDSOD", description: "Maxes muscle stats", impact: "green" },
      { code: "OGXSDAG", description: "Max respect", impact: "green" },
      { code: "EHIBXQS", description: "Max sex appeal", impact: "green" },
      { code: "WORSHIPME", description: "Max respect instantly", impact: "green" },
      { code: "HELLOLADIES", description: "Max sex appeal instantly", impact: "green" },
      { code: "NATURALTALENT", description: "Maxes all vehicle skill stats", impact: "green" },
      { code: "BUFFMEUP", description: "Instant max muscle", impact: "green" },
      { code: "LEANANDMEAN", description: "Instant skinny body", impact: "yellow" },
      { code: "SZCMAWO", description: "Instantly kills CJ", impact: "red" },
      { code: "KANGAROO", description: "Gives super jump ability", impact: "yellow" },
      { code: "STINGLIKEABEE", description: "Super powerful punches", impact: "yellow" },
      { code: "ANOSEONGLASS", description: "Adrenaline slow-motion mode", impact: "yellow" },
      { code: "FULLCLIP", description: "Infinite ammo, no reload", impact: "green" },
      { code: "PROFESSIONALKILLER", description: "Hitman skill with all weapons", impact: "green" },
      { code: "OUIQDMW", description: "Free aim while driving", impact: "green" },
    ],
  },
  {
    id: "weapons",
    title: "Weapons",
    emoji: "🔫",
    cheats: [
      { code: "LXGIWYL", description: "Weapon Set 1 (basic weapons)", impact: "green" },
      { code: "PROFESSIONALSKIT", description: "Weapon Set 2 (professional weapons)", impact: "green" },
      { code: "UZUMYMW", description: "Weapon Set 3 (heavy/explosive weapons)", impact: "yellow" },
    ],
  },
  {
    id: "wanted",
    title: "Wanted Level",
    emoji: "🚔",
    cheats: [
      { code: "TURNUPTHEHEAT", description: "Raises wanted level by 2 stars", impact: "yellow" },
      { code: "TURNDOWNTHEHEAT", description: "Clears wanted level completely", impact: "green" },
      { code: "AEZAKMI", description: "Locks wanted level at 0", impact: "yellow" },
      { code: "BRINGITON", description: "Instantly gives 6-star wanted level", impact: "red" },
    ],
  },
  {
    id: "vehicles",
    title: "Vehicle Spawns",
    emoji: "🚗",
    cheats: [
      { code: "ROCKETMAN", description: "Spawns a jetpack", impact: "blue" },
      { code: "AIYPWZQP", description: "Spawns a parachute", impact: "blue" },
      { code: "JUMPJET", description: "Spawns a Hydra fighter jet", impact: "blue" },
      { code: "OHDUDE", description: "Spawns a Hunter attack helicopter", impact: "blue" },
      { code: "AIWPRTON", description: "Spawns a Rhino tank", impact: "blue" },
      { code: "OLDSPEEDDEMON", description: "Spawns Bloodring Banger", impact: "blue" },
      { code: "VROCKPOKEY", description: "Spawns Hotring Racer #1", impact: "blue" },
      { code: "VPJTQWV", description: "Spawns Hotring Racer #2", impact: "blue" },
      { code: "JQNTDMH", description: "Spawns Rancher SUV", impact: "blue" },
      { code: "CQZIJMB", description: "Spawns Bloodring Banger (alternate)", impact: "blue" },
      { code: "CELEBRITYSTATUS", description: "Spawns stretch limousine", impact: "blue" },
      { code: "WHERESTHEFUNERAL", description: "Spawns Romero hearse", impact: "blue" },
      { code: "TRUEGRIME", description: "Spawns Trashmaster garbage truck", impact: "blue" },
      { code: "RZHSUEW", description: "Spawns golf caddy", impact: "blue" },
      { code: "ITSALLBULL", description: "Spawns bulldozer", impact: "blue" },
      { code: "FOURWHEELFUN", description: "Spawns quad bike", impact: "blue" },
      { code: "FLYINGTOSTUNT", description: "Spawns stunt plane", impact: "blue" },
      { code: "MONSTERMASH", description: "Spawns monster truck", impact: "blue" },
      { code: "AMOMHRER", description: "Spawns tanker truck", impact: "blue" },
      { code: "KGGGDKP", description: "Spawns Vortex hovercraft", impact: "blue" },
    ],
  },
  {
    id: "vehicle-abilities",
    title: "Vehicle Abilities",
    emoji: "🚘",
    cheats: [
      { code: "SPEEDFREAK", description: "Adds nitrous to all cars", impact: "blue" },
      { code: "STICKLIKEGLUE", description: "Gives all vehicles perfect handling", impact: "green" },
      { code: "CHITTYCHITTYBANGBANG", description: "Cars can fly", impact: "yellow" },
      { code: "RIPAZHA", description: "Cars gain airborne flight control", impact: "yellow" },
      { code: "FLYINGFISH", description: "Boats can fly", impact: "yellow" },
      { code: "GKPNMQ", description: "Cars can drive on water", impact: "yellow" },
      { code: "BUBBLECARS", description: "Cars float away when hit", impact: "yellow" },
      { code: "JCNRUAD", description: "Cars explode easily on impact", impact: "red" },
      { code: "CPKTNWT", description: "Blows up all cars nearby", impact: "red" },
      { code: "WHEELSONLYPLEASE", description: "Makes vehicles invisible except wheels", impact: "blue" },
      { code: "XICWMD", description: "Makes cars appear invisible", impact: "blue" },
      { code: "ZEIIVG", description: "All traffic lights stay green", impact: "green" },
      { code: "YLTEICZ", description: "Aggressive traffic drivers", impact: "red" },
      { code: "LLQPFBN", description: "All traffic becomes pink", impact: "blue" },
      { code: "IOWDLAC", description: "All traffic becomes black", impact: "blue" },
      { code: "GUSNHDE", description: "Roads fill with fast sports cars", impact: "blue" },
      { code: "EVERYONEISRICH", description: "Traffic uses expensive vehicles", impact: "blue" },
      { code: "EVERYONEISPOOR", description: "Traffic uses cheap junk cars", impact: "blue" },
      { code: "FVTMNBZ", description: "Country-style traffic vehicles", impact: "blue" },
      { code: "GHOSTTOWN", description: "Nearly removes all traffic", impact: "yellow" },
    ],
  },
  {
    id: "weather",
    title: "Weather & Time",
    emoji: "🌦",
    cheats: [
      { code: "AFZLLQLL", description: "Sunny weather", impact: "blue" },
      { code: "ICIKPYH", description: "Extra sunny weather", impact: "blue" },
      { code: "AUIFRVQS", description: "Rainy weather", impact: "blue" },
      { code: "CFVFGMJ", description: "Foggy weather", impact: "blue" },
      { code: "MGHXYRM", description: "Thunderstorm weather", impact: "blue" },
      { code: "CWJXUOC", description: "Creates a sandstorm", impact: "blue" },
      { code: "NIGHTPROWLER", description: "Locks time to midnight", impact: "yellow" },
      { code: "OFVIAC", description: "Gives orange sunset sky", impact: "blue" },
      { code: "YSOHNUL", description: "Speeds up the game clock", impact: "yellow" },
      { code: "SPEEDITUP", description: "Speeds up gameplay", impact: "yellow" },
      { code: "SLOWITDOWN", description: "Slows gameplay down", impact: "yellow" },
    ],
  },
  {
    id: "peds",
    title: "Pedestrians & Gangs",
    emoji: "👥",
    cheats: [
      { code: "STATEOFEMERGENCY", description: "Citizens riot everywhere", impact: "red" },
      { code: "IOJUFZN", description: "Full chaos mode in streets", impact: "red" },
      { code: "AJLOJYQY", description: "Pedestrians attack each other", impact: "red" },
      { code: "BAGOWPG", description: "Pedestrians attack CJ", impact: "red" },
      { code: "FOOOXFT", description: "Everyone carries weapons", impact: "red" },
      { code: "BGLUAWML", description: "Civilians attack with rocket launchers", impact: "red" },
      { code: "SJMAHPE", description: "Recruit anyone with pistols", impact: "yellow" },
      { code: "ZSOXFSQ", description: "Recruit anyone with rocket launchers", impact: "yellow" },
      { code: "ONLYHOMIESALLOWED", description: "Gang members everywhere", impact: "yellow" },
      { code: "BIFBUZZ", description: "Gangs take over the streets", impact: "red" },
      { code: "MROEMZH", description: "Random gangs appear everywhere", impact: "red" },
    ],
  },
  {
    id: "themes",
    title: "Themes & World",
    emoji: "🎭",
    cheats: [
      { code: "CIKGCGX", description: "Beach party mode", impact: "blue" },
      { code: "PRIEBJ", description: "Funhouse / carnival theme", impact: "blue" },
      { code: "AFPHULTL", description: "Ninja theme", impact: "blue" },
      { code: "BEKKNQV", description: "Attracts women easily (\"slut magnet\")", impact: "blue" },
      { code: "BMTPWHR", description: "Country / rural theme", impact: "blue" },
      { code: "BLUESUEDESHOES", description: "Elvis impersonators everywhere", impact: "blue" },
      { code: "CRAZYTOWN", description: "Weird carnival pedestrians and cars", impact: "blue" },
      { code: "NINJATOWN", description: "Converts world into ninja theme", impact: "blue" },
      { code: "LIFESABEACH", description: "Beach-style world setting", impact: "blue" },
    ],
  },
  {
    id: "movement",
    title: "Movement & Physics",
    emoji: "🏃",
    cheats: [
      { code: "CJPHONEHOME", description: "Huge BMX bunny hops", impact: "yellow" },
      { code: "JHJOECW", description: "Huge vehicle bunny hops", impact: "yellow" },
      { code: "BSXSGGC", description: "Reduced gravity physics", impact: "yellow" },
      { code: "SWIMLIKEFISH", description: "Super fast swimming", impact: "green" },
      { code: "LIFTSHIT", description: "Super fast climbing", impact: "green" },
      { code: "THGLOJ", description: "Reduced traffic and weird physics", impact: "yellow" },
      { code: "VKYPQCF", description: "Max taxi nitro boosts", impact: "green" },
    ],
  },
  {
    id: "hidden",
    title: "Lesser-Known / Hidden",
    emoji: "🕹",
    cheats: [
      { code: "YECGAA", description: "Alternate code for Jetpack", impact: "blue" },
      { code: "COXEFGU", description: "Alternate nitrous cheat", impact: "blue" },
      { code: "ASBHGRB", description: "Elvis NPC theme variant", impact: "blue" },
      { code: "AFSNMSMW", description: "Flying boats (alternate code)", impact: "yellow" },
      { code: "XJVSNAJ", description: "Permanent midnight world", impact: "yellow" },
    ],
  },
];

export const IMPACT_META: Record<Impact, { label: string; description: string; dot: string; ring: string; bg: string; text: string; glow: string }> = {
  green: {
    label: "Safe",
    description: "Pure benefit — no real downside",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    glow: "shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]",
  },
  blue: {
    label: "Neutral",
    description: "Cosmetic or fun, minimal impact",
    dot: "bg-sky-400",
    ring: "ring-sky-400/40",
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    glow: "shadow-[0_0_20px_-5px_rgba(56,189,248,0.5)]",
  },
  yellow: {
    label: "Caution",
    description: "Alters gameplay; may disable trophies",
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    glow: "shadow-[0_0_20px_-5px_rgba(251,191,36,0.5)]",
  },
  red: {
    label: "Disruptive",
    description: "Can break missions or corrupt save",
    dot: "bg-rose-400",
    ring: "ring-rose-400/40",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    glow: "shadow-[0_0_20px_-5px_rgba(244,63,94,0.5)]",
  },
};
