
export const LINK_MY_BLOGS = `http://its-ians-blog.vercel.app/user/${process.env.NEXT_PUBLIC_BLOG_USER_ID}`;

export const LINKS = [
    { name: "About Me", href: "/about-me", tagline: "My skills and who I am", newTab: true },
   // { name: "Blogs", href: LINK_MY_BLOGS, tagline: "Read my latest blog posts", newTab: true },
    { name: "C++ Zone", href: "/its-cpp", tagline: "Explore C++ projects and tutorials", newTab: true },
    { name: "Time", href: "/its-time", tagline: "Check the current time gigantically fullscreen", newTab: true },
    { name: "Chat", href: "/about", tagline: "Join the chat and connect with others", newTab: false },
    { name: "ItsPaint", href: "/itspaint", tagline: "Fully featured browser based paint application", newTab: true },
    { name: "PathLockV2", href: "/pathlockv2/2p1", tagline: "Visual dish alignment tool", newTab: true },
    { name: "KwikMaps", href: "/kwikmaps", tagline: "Create efficient routes with AI", newTab: true },
    { name: "Google Search", href: "https://google.com", tagline: "Quickly get to the google search bar", newTab: true },
    
]
