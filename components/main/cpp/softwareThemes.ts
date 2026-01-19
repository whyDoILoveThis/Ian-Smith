export type Theme =
  | "win95"
  | "xp"
  | "terminal"
  | "sunset"
  | "neon"
  | "pdanet"
  | "default";

export type ThemeStyles = {
  container: string;
  card: string;
  border: string;
  title: string;
  button: string;
  navbar: string;
  navbarLink: string;
};

export const softwareThemes: Record<Theme, ThemeStyles> = {
  win95: {
    container: "bg-gray-300 text-black",
    card: "bg-gray-200 shadow-[2px_2px_0_#fff_inset,-2px_-2px_0_#777_inset]",
    border: "border-gray-600",
    title: "font-serif text-2xl tracking-tight",
    button:
      "bg-gray-100 text-black border border-gray-600 shadow-[2px_2px_0_#fff_inset,-2px_-2px_0_#777_inset] hover:bg-gray-200",
    navbar:
      "bg-gray-200 border-b-2 border-gray-600 shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#777] ",
    navbarLink: "px-4 py-2 hover:bg-gray-300",
  },
  xp: {
    container: "bg-sky-200 text-gray-900",
    card: "bg-white border border-sky-400 rounded-md shadow-md",
    border: "border-sky-500",
    title: "font-sans text-3xl text-sky-800",
    button: "bg-green-500 text-white font-bold px-6 py-2 rounded hover:bg-green-600",
    navbar: "bg-sky-400 text-white flex",
    navbarLink: "px-4 py-2 hover:bg-sky-500",
  },
  terminal: {
    container: "bg-black text-green-400 font-mono",
    card: "bg-black border border-green-600",
    border: "border-green-600",
    title: "text-green-300 text-2xl font-mono",
    button:
      "bg-green-700 text-black font-bold px-6 py-2 hover:bg-green-600 border border-green-400",
    navbar: "bg-black border-b border-green-600 flex",
    navbarLink: "px-4 py-2 hover:bg-green-700 hover:text-black",
  },
  sunset: {
    container: "bg-gradient-to-br from-orange-500 via-pink-600 to-purple-700 text-white",
    card: "bg-black/40 border border-orange-300 backdrop-blur-md",
    border: "border-pink-400",
    title: "text-yellow-200 text-3xl font-bold",
    button: "bg-yellow-400 text-black px-6 py-2 rounded-md hover:bg-yellow-500 font-bold",
    navbar: "bg-black/30 backdrop-blur-md flex border-b border-orange-300",
    navbarLink: "px-4 py-2 hover:bg-yellow-400 hover:text-black",
  },
  neon: {
    container: "bg-gray-900 text-pink-400 font-mono",
    card: "bg-black border border-pink-600 shadow-[0_0_10px_#ff00ff]",
    border: "border-pink-600",
    title: "text-cyan-400 text-3xl font-extrabold tracking-widest",
    button: "bg-pink-600 text-white px-6 py-2 hover:bg-pink-500 shadow-[0_0_10px_#ff00ff]",
    navbar: "bg-black border-b border-pink-600 shadow-[0_0_10px_#ff00ff] flex",
    navbarLink: "px-4 py-2 hover:text-cyan-400",
  },
  pdanet: {
    container: "bg-white text-black",
    card: "bg-gray-50 border border-gray-400 shadow-lg",
    border: "border-gray-500",
    title: "text-xl font-bold text-blue-700",
    button: "bg-blue-600 text-white px-6 py-2 rounded-sm hover:bg-blue-700 border border-blue-800",
    navbar: "bg-blue-700 text-white flex",
    navbarLink: "px-4 py-2 hover:bg-blue-600",
  },
  default: {
    container: "bg-gray-100 dark:bg-gray-900 text-black dark:text-white",
    card: "bg-white dark:bg-gray-800 border border-gray-400 dark:border-gray-700 shadow-md",
    border: "border-gray-400",
    title: "text-3xl font-bold",
    button: "bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 border border-blue-800",
    navbar: "bg-gray-800 text-white flex border-b border-gray-600 dark:bg-gray-900",
    navbarLink: "px-4 py-2 hover:bg-gray-700",
  },
};
