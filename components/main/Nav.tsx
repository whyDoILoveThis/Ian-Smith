import { ThemeToggler } from "@/components/Theme/ThemeToggler";
import Link from "next/link";

const Nav = () => {
  return (
    <nav className="fixed top-0 w-screen max-w-[800px] flex justify-between items-center p-2 border-b border-opacity-10 bg-blur-10">
      <Link className="font-bold text-2xl" href={"/"}>
        ITS
      </Link>
      <ThemeToggler />
    </nav>
  );
};

export default Nav;
