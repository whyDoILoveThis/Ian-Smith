import { IoClose } from "react-icons/io5";
interface Props {
  size?: number;
}
const CloseIcon = ({ size }: Props) => {
  return <IoClose size={size} />;
};

export default CloseIcon;
