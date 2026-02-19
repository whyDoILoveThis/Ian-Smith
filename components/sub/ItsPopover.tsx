import React, { useEffect } from "react";
import CloseIcon from "./CloseIcon";

interface Props {
  className?: string;
  children?: React.ReactNode;
  zIndex?: string;
  show?: boolean;
  setShow?: (show: boolean) => void;
  closeWhenClicked?: boolean;
  bgBlur?: "0" | "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const ItsPopover = ({
  className,
  children,
  zIndex = "999",
  show,
  setShow,
  closeWhenClicked = true,
  bgBlur,
}: Props) => {
  const isOpen = true;
  useEffect(() => {
    // Disable body scroll when popover is open
    if (isOpen) {
      document.body.classList.add("!overflow-hidden");
    } else {
      document.body.classList.remove("");
    }

    // Clean up to remove class when component unmounts or closes
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return;

  return (
    <div
      onClick={() => setShow && closeWhenClicked && setShow(false)}
      className={`bg-black bg-opacity-60 fixed inset-0 zz-top-plus4 
                    flex flex-col items-center ${className && className}
    `}
    >
      {bgBlur !== "0" && bgBlur !== "none" && (
        <span
          onClick={() => {
            setShow && setShow(false);
          }}
          className={`absolute z-20 inset-0 backdrop-blur-${bgBlur ? bgBlur : "md"}`}
        />
      )}
      <div className="w-full z-40 h-full max-w-[800px] relative  flex flex-col justify-center items-center ">
        {children}
      </div>
    </div>
  );
};

export default ItsPopover;
