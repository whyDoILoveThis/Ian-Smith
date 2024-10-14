import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";

const Nav = () => {
  return (
    <nav className="z-50 fixed top-0 w-screen max-w-[800px] flex justify-between items-center p-2 px-6 border-b bg-blur-10">
      <Link className="font-bold text-2xl" href={"/"}>
        ITS
      </Link>
      <div className="flex gap-6 items-center">
        <Link className="hover:underline" href={"/about-me"}>
          About Me
        </Link>
        <Link
          className="hover:underline"
          href={
            "http://its-ians-blog.vercel.app/user/user_2iqJuHsepKWDsGxo2o6rczQpvYq"
          }
        >
          My Blogs
        </Link>
        <ThemeToggler />
      </div>
    </nav>
  );
};

export default Nav;
