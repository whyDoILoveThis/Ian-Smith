import React, { useEffect } from "react";

interface Props {
  children?: React.ReactNode;
  zIndex?: string;
  show?: boolean;
  setShow?: (show: boolean) => void;
}

const ItsPopover = ({ children, zIndex = "999", show, setShow }: Props) => {
  const isOpen = true;
  useEffect(() => {
    // Disable body scroll when popover is open
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("");
    }

    // Clean up to remove class when component unmounts or closes
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  if (!show) return;

  return (
    <div
      className={`bg-black pt-16 bg-opacity-60 fixed z-40 top-0 left-0 w-screen h-screen backdrop-blur-md 
                    flex flex-col items-center 
    `}
    >
      <button
        className="btn btn-round btn-red absolute top-20 right-10 z-50"
        onClick={() => {
          if (setShow) {
            setShow(false);
          }
        }}
      >
        X
      </button>
      <div className="w-full h-full max-w-[800px] relative  flex flex-col items-center ">
        {children}
      </div>
    </div>
  );
};

export default ItsPopover;
