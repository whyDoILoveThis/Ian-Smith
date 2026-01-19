import React from "react";

interface Props {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultChecked?: boolean;
}

const ItsCheckbox = ({ value, onChange, defaultChecked }: Props) => {
  return (
    <label className="flex select-none relative justify-center items-center gap-3 cursor-pointer">
      <input
        value={value}
        onChange={onChange}
        defaultChecked={defaultChecked}
        type="checkbox"
        className="peer hidden"
      />

      <div
        className="w-5 h-5 rounded-full border-2 border-blue-500
                  peer-checked:bg-blue-500
                  peer-checked:border-blue-500
                  
                  transition"
      ></div>
      <span className="absolute text-white text-sm opacity-0 peer-checked:opacity-100">
        ✓
      </span>
    </label>
  );
};

export default ItsCheckbox;
