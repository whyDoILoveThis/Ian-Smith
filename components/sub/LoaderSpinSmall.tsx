import "../../styles/ItsLoaderSpinSmall.css";

interface Props {
  color?: string; // e.g., "pink", "blue", "green", "red", etc.
}

const LoaderSpinSmall = ({ color = "" }: Props) => {
  // Dynamically construct the class name based on the color
  const className =
    color && color !== "" && `loader-spin-small-${color.toLowerCase()}`;

  return <div className={`loader-spin-small ${className}`} />;
};

export default LoaderSpinSmall;
