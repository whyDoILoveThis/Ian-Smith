import Link from "next/link";
import FacebookIcon from "../sub/FacebookIcon";
import GithubIcon from "../sub/GithubIcon";

const SocialLinks = () => {
  return (
    <div className="flex items-center gap-5">
      <Link
        className="text-[26px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-200"
        href={"https://facebook.com"}
      >
        <FacebookIcon />
      </Link>
      <Link
        className="text-[22px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-200"
        href={"https://github.com"}
      >
        <GithubIcon />
      </Link>
    </div>
  );
};

export default SocialLinks;
