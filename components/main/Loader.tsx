import React from "react";
import { RotatingLines } from "react-loader-spinner";

const Loader = () => {
  return (
    <div>
      {" "}
      <RotatingLines
        width="20"
        visible={true}
        strokeWidth="5"
        strokeColor="grey"
        animationDuration="5"
        ariaLabel="rotating-lines-loading"
      />
    </div>
  );
};

export default Loader;
