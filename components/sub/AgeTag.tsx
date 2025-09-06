"use client";
import { useMemo } from "react";

export default function AgeTag() {
  const birthday = new Date(1998, 3, 14); // month is 0-based -> April = 3

  const age = useMemo(() => {
    const today = new Date();
    let years = today.getFullYear() - birthday.getFullYear();

    const hasHadBirthdayThisYear =
      today.getMonth() > birthday.getMonth() ||
      (today.getMonth() === birthday.getMonth() &&
        today.getDate() >= birthday.getDate());

    if (!hasHadBirthdayThisYear) {
      years -= 1;
    }

    return years;
  }, []);

  return <p className="text-sm text-slate-400 self-end">{age} years old</p>;
}
