import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";

const Nav = () => {
  return (
    <nav className="z-50 fixed top-0 w-screen max-w-[800px] flex justify-between items-center p-2 px-4 border-b bg-blur-10">
      <Link className="font-bold text-2xl" href={"/"}>
        ITS
      </Link>
      <ThemeToggler />
    </nav>
  );
};

export default Nav;
