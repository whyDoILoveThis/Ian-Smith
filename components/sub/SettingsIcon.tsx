import { FaGear } from "react-icons/fa6";
interface Props {
  size?: number;
}
const SettingsIcon = ({ size }: Props) => {
  return <FaGear size={size} />;
};

export default SettingsIcon;
