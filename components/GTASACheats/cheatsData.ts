export type Impact = "green" | "blue" | "yellow" | "red";

export interface Cheat {
  code: string;
  name: string;
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
      { code: "HESOYAM", name: "Health, Armor & $250K", description: "Gives $250,000, full health, and full armor", impact: "green" },
      { code: "BAGUVIX", name: "Infinite Health", description: "Makes CJ almost invincible (still vulnerable to explosions/falls)", impact: "yellow" },
      { code: "CVWKXAM", name: "Infinite Oxygen", description: "Infinite oxygen underwater", impact: "green" },
      { code: "AEDUWNV", name: "Never Hungry", description: "CJ never gets hungry", impact: "green" },
      { code: "BTCDBCB", name: "Fat CJ", description: "Makes CJ extremely fat", impact: "yellow" },
      { code: "KVGYZQK", name: "Skinny CJ", description: "Makes CJ very skinny", impact: "yellow" },
      { code: "JYSDSOD", name: "Max Muscle", description: "Maxes muscle stats", impact: "green" },
      { code: "OGXSDAG", name: "Max Respect", description: "Max respect", impact: "green" },
      { code: "EHIBXQS", name: "Max Sex Appeal", description: "Max sex appeal", impact: "green" },
      { code: "WORSHIPME", name: "Instant Max Respect", description: "Max respect instantly", impact: "green" },
      { code: "HELLOLADIES", name: "Instant Max Sex Appeal", description: "Max sex appeal instantly", impact: "green" },
      { code: "NATURALTALENT", name: "Max Vehicle Skills", description: "Maxes all vehicle skill stats", impact: "green" },
      { code: "BUFFMEUP", name: "Instant Buff", description: "Instant max muscle", impact: "green" },
      { code: "LEANANDMEAN", name: "Instant Lean", description: "Instant skinny body", impact: "yellow" },
      { code: "SZCMAWO", name: "Suicide", description: "Instantly kills CJ", impact: "red" },
      { code: "KANGAROO", name: "Super Jump", description: "Gives super jump ability", impact: "yellow" },
      { code: "STINGLIKEABEE", name: "Super Punch", description: "Super powerful punches", impact: "yellow" },
      { code: "ANOSEONGLASS", name: "Adrenaline Mode", description: "Adrenaline slow-motion mode", impact: "yellow" },
      { code: "FULLCLIP", name: "Infinite Ammo", description: "Infinite ammo, no reload", impact: "green" },
      { code: "PROFESSIONALKILLER", name: "Hitman Level", description: "Hitman skill with all weapons", impact: "green" },
      { code: "OUIQDMW", name: "Drive-By Free Aim", description: "Free aim while driving", impact: "green" },
    ],
  },
  {
    id: "weapons",
    title: "Weapons",
    emoji: "🔫",
    cheats: [
      { code: "LXGIWYL", name: "Weapon Set 1", description: "Weapon Set 1 (basic weapons)", impact: "green" },
      { code: "PROFESSIONALSKIT", name: "Weapon Set 2", description: "Weapon Set 2 (professional weapons)", impact: "green" },
      { code: "UZUMYMW", name: "Weapon Set 3", description: "Weapon Set 3 (heavy/explosive weapons)", impact: "yellow" },
    ],
  },
  {
    id: "wanted",
    title: "Wanted Level",
    emoji: "🚔",
    cheats: [
      { code: "TURNUPTHEHEAT", name: "+2 Wanted Stars", description: "Raises wanted level by 2 stars", impact: "yellow" },
      { code: "TURNDOWNTHEHEAT", name: "Clear Wanted Level", description: "Clears wanted level completely", impact: "green" },
      { code: "AEZAKMI", name: "Never Wanted", description: "Locks wanted level at 0", impact: "yellow" },
      { code: "BRINGITON", name: "6-Star Wanted", description: "Instantly gives 6-star wanted level", impact: "red" },
    ],
  },
  {
    id: "vehicles",
    title: "Vehicle Spawns",
    emoji: "🚗",
    cheats: [
      { code: "ROCKETMAN", name: "Spawn Jetpack", description: "Spawns a jetpack", impact: "blue" },
      { code: "AIYPWZQP", name: "Spawn Parachute", description: "Spawns a parachute", impact: "blue" },
      { code: "JUMPJET", name: "Spawn Hydra Jet", description: "Spawns a Hydra fighter jet", impact: "blue" },
      { code: "OHDUDE", name: "Spawn Hunter Heli", description: "Spawns a Hunter attack helicopter", impact: "blue" },
      { code: "AIWPRTON", name: "Spawn Rhino Tank", description: "Spawns a Rhino tank", impact: "blue" },
      { code: "OLDSPEEDDEMON", name: "Spawn Bloodring Banger", description: "Spawns Bloodring Banger", impact: "blue" },
      { code: "VROCKPOKEY", name: "Spawn Hotring Racer", description: "Spawns Hotring Racer #1", impact: "blue" },
      { code: "VPJTQWV", name: "Spawn Hotring Racer #2", description: "Spawns Hotring Racer #2", impact: "blue" },
      { code: "JQNTDMH", name: "Spawn Rancher", description: "Spawns Rancher SUV", impact: "blue" },
      { code: "CQZIJMB", name: "Spawn Bloodring (Alt)", description: "Spawns Bloodring Banger (alternate)", impact: "blue" },
      { code: "CELEBRITYSTATUS", name: "Spawn Stretch Limo", description: "Spawns stretch limousine", impact: "blue" },
      { code: "WHERESTHEFUNERAL", name: "Spawn Romero Hearse", description: "Spawns Romero hearse", impact: "blue" },
      { code: "TRUEGRIME", name: "Spawn Trashmaster", description: "Spawns Trashmaster garbage truck", impact: "blue" },
      { code: "RZHSUEW", name: "Spawn Golf Caddy", description: "Spawns golf caddy", impact: "blue" },
      { code: "ITSALLBULL", name: "Spawn Bulldozer", description: "Spawns bulldozer", impact: "blue" },
      { code: "FOURWHEELFUN", name: "Spawn Quad Bike", description: "Spawns quad bike", impact: "blue" },
      { code: "FLYINGTOSTUNT", name: "Spawn Stunt Plane", description: "Spawns stunt plane", impact: "blue" },
      { code: "MONSTERMASH", name: "Spawn Monster Truck", description: "Spawns monster truck", impact: "blue" },
      { code: "AMOMHRER", name: "Spawn Tanker Truck", description: "Spawns tanker truck", impact: "blue" },
      { code: "KGGGDKP", name: "Spawn Vortex Hovercraft", description: "Spawns Vortex hovercraft", impact: "blue" },
    ],
  },
  {
    id: "vehicle-abilities",
    title: "Vehicle Abilities",
    emoji: "🚘",
    cheats: [
      { code: "SPEEDFREAK", name: "All Cars Nitro", description: "Adds nitrous to all cars", impact: "blue" },
      { code: "STICKLIKEGLUE", name: "Perfect Handling", description: "Gives all vehicles perfect handling", impact: "green" },
      { code: "CHITTYCHITTYBANGBANG", name: "Flying Cars", description: "Cars can fly", impact: "yellow" },
      { code: "RIPAZHA", name: "Airborne Cars", description: "Cars gain airborne flight control", impact: "yellow" },
      { code: "FLYINGFISH", name: "Flying Boats", description: "Boats can fly", impact: "yellow" },
      { code: "GKPNMQ", name: "Cars on Water", description: "Cars can drive on water", impact: "yellow" },
      { code: "BUBBLECARS", name: "Floaty Cars", description: "Cars float away when hit", impact: "yellow" },
      { code: "JCNRUAD", name: "Demolition Derby", description: "Cars explode easily on impact", impact: "red" },
      { code: "CPKTNWT", name: "Explode All Cars", description: "Blows up all cars nearby", impact: "red" },
      { code: "WHEELSONLYPLEASE", name: "Invisible Cars (Wheels Only)", description: "Makes vehicles invisible except wheels", impact: "blue" },
      { code: "XICWMD", name: "Invisible Cars", description: "Makes cars appear invisible", impact: "blue" },
      { code: "ZEIIVG", name: "All Green Lights", description: "All traffic lights stay green", impact: "green" },
      { code: "YLTEICZ", name: "Aggressive Drivers", description: "Aggressive traffic drivers", impact: "red" },
      { code: "LLQPFBN", name: "Pink Traffic", description: "All traffic becomes pink", impact: "blue" },
      { code: "IOWDLAC", name: "Black Traffic", description: "All traffic becomes black", impact: "blue" },
      { code: "GUSNHDE", name: "Sports Car Traffic", description: "Roads fill with fast sports cars", impact: "blue" },
      { code: "EVERYONEISRICH", name: "Rich Traffic", description: "Traffic uses expensive vehicles", impact: "blue" },
      { code: "EVERYONEISPOOR", name: "Poor Traffic", description: "Traffic uses cheap junk cars", impact: "blue" },
      { code: "FVTMNBZ", name: "Country Traffic", description: "Country-style traffic vehicles", impact: "blue" },
      { code: "GHOSTTOWN", name: "Ghost Town", description: "Nearly removes all traffic", impact: "yellow" },
    ],
  },
  {
    id: "weather",
    title: "Weather & Time",
    emoji: "🌦",
    cheats: [
      { code: "AFZLLQLL", name: "Sunny", description: "Sunny weather", impact: "blue" },
      { code: "ICIKPYH", name: "Extra Sunny", description: "Extra sunny weather", impact: "blue" },
      { code: "AUIFRVQS", name: "Rainy", description: "Rainy weather", impact: "blue" },
      { code: "CFVFGMJ", name: "Foggy", description: "Foggy weather", impact: "blue" },
      { code: "MGHXYRM", name: "Thunderstorm", description: "Thunderstorm weather", impact: "blue" },
      { code: "CWJXUOC", name: "Sandstorm", description: "Creates a sandstorm", impact: "blue" },
      { code: "NIGHTPROWLER", name: "Always Midnight", description: "Locks time to midnight", impact: "yellow" },
      { code: "OFVIAC", name: "Orange Sunset", description: "Gives orange sunset sky", impact: "blue" },
      { code: "YSOHNUL", name: "Faster Clock", description: "Speeds up the game clock", impact: "yellow" },
      { code: "SPEEDITUP", name: "Faster Gameplay", description: "Speeds up gameplay", impact: "yellow" },
      { code: "SLOWITDOWN", name: "Slower Gameplay", description: "Slows gameplay down", impact: "yellow" },
    ],
  },
  {
    id: "peds",
    title: "Pedestrians & Gangs",
    emoji: "👥",
    cheats: [
      { code: "STATEOFEMERGENCY", name: "Riot Mode", description: "Citizens riot everywhere", impact: "red" },
      { code: "IOJUFZN", name: "Chaos Mode", description: "Full chaos mode in streets", impact: "red" },
      { code: "AJLOJYQY", name: "Peds Fight Each Other", description: "Pedestrians attack each other", impact: "red" },
      { code: "BAGOWPG", name: "Peds Attack CJ", description: "Pedestrians attack CJ", impact: "red" },
      { code: "FOOOXFT", name: "Armed Peds", description: "Everyone carries weapons", impact: "red" },
      { code: "BGLUAWML", name: "Rocket Launcher Peds", description: "Civilians attack with rocket launchers", impact: "red" },
      { code: "SJMAHPE", name: "Recruit Anyone (Pistols)", description: "Recruit anyone with pistols", impact: "yellow" },
      { code: "ZSOXFSQ", name: "Recruit Anyone (Rockets)", description: "Recruit anyone with rocket launchers", impact: "yellow" },
      { code: "ONLYHOMIESALLOWED", name: "Gangs Everywhere", description: "Gang members everywhere", impact: "yellow" },
      { code: "BIFBUZZ", name: "Gangs Control Streets", description: "Gangs take over the streets", impact: "red" },
      { code: "MROEMZH", name: "Random Gang Wars", description: "Random gangs appear everywhere", impact: "red" },
    ],
  },
  {
    id: "themes",
    title: "Themes & World",
    emoji: "🎭",
    cheats: [
      { code: "CIKGCGX", name: "Beach Party Mode", description: "Beach party mode", impact: "blue" },
      { code: "PRIEBJ", name: "Funhouse Theme", description: "Funhouse / carnival theme", impact: "blue" },
      { code: "AFPHULTL", name: "Ninja Theme", description: "Ninja theme", impact: "blue" },
      { code: "BEKKNQV", name: "Slut Magnet", description: "Attracts women easily (\"slut magnet\")", impact: "blue" },
      { code: "BMTPWHR", name: "Country Theme", description: "Country / rural theme", impact: "blue" },
      { code: "BLUESUEDESHOES", name: "Elvis Everywhere", description: "Elvis impersonators everywhere", impact: "blue" },
      { code: "CRAZYTOWN", name: "Crazy Town", description: "Weird carnival pedestrians and cars", impact: "blue" },
      { code: "NINJATOWN", name: "Ninja Town", description: "Converts world into ninja theme", impact: "blue" },
      { code: "LIFESABEACH", name: "Life's a Beach", description: "Beach-style world setting", impact: "blue" },
    ],
  },
  {
    id: "movement",
    title: "Movement & Physics",
    emoji: "🏃",
    cheats: [
      { code: "CJPHONEHOME", name: "Mega BMX Hops", description: "Huge BMX bunny hops", impact: "yellow" },
      { code: "JHJOECW", name: "Mega Vehicle Hops", description: "Huge vehicle bunny hops", impact: "yellow" },
      { code: "BSXSGGC", name: "Low Gravity", description: "Reduced gravity physics", impact: "yellow" },
      { code: "SWIMLIKEFISH", name: "Super Swim", description: "Super fast swimming", impact: "green" },
      { code: "LIFTSHIT", name: "Super Climb", description: "Super fast climbing", impact: "green" },
      { code: "THGLOJ", name: "Weird Physics", description: "Reduced traffic and weird physics", impact: "yellow" },
      { code: "VKYPQCF", name: "Taxi Nitro & Hops", description: "Max taxi nitro boosts", impact: "green" },
    ],
  },
  {
    id: "hidden",
    title: "Lesser-Known / Hidden",
    emoji: "🕹",
    cheats: [
      { code: "YECGAA", name: "Jetpack (Alt)", description: "Alternate code for Jetpack", impact: "blue" },
      { code: "COXEFGU", name: "Nitrous (Alt)", description: "Alternate nitrous cheat", impact: "blue" },
      { code: "ASBHGRB", name: "Elvis Theme (Alt)", description: "Elvis NPC theme variant", impact: "blue" },
      { code: "AFSNMSMW", name: "Flying Boats (Alt)", description: "Flying boats (alternate code)", impact: "yellow" },
      { code: "XJVSNAJ", name: "Permanent Midnight", description: "Permanent midnight world", impact: "yellow" },
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
