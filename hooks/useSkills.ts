import { useState, useEffect } from "react";
import { appwrFetchSkills } from "@/appwrite/appwrSkillManager"; // wherever your fetch function lives

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      const skillsList = await appwrFetchSkills();
      setSkills(skillsList);
    };

    fetchSkills();
  }, []);

  return skills;
}
