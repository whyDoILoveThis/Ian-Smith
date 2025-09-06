"use client";

import React, { useMemo } from "react";
import ItsConfettiCannon from "../sub/ItsConfettiCannon";

// 🎉 Giant list of ~100 holidays & special days worldwide
export const SPECIAL_DAYS = [
  { name: "New Year's Day", date: "01-01" },
  { name: "Science Fiction Day", date: "01-02" },
  { name: "Trivia Day", date: "01-04" },
  { name: "Epiphany", date: "01-06" },
  { name: "Law Enforcement Appreciation Day", date: "01-09" },
  { name: "National Milk Day", date: "01-11" },
  { name: "National Sticker Day", date: "01-13" },
  { name: "Martin Luther King Jr. Day", date: "01-15" },
  { name: "National Popcorn Day", date: "01-19" },
  { name: "National Hug Day", date: "01-21" },
  { name: "National Pie Day", date: "01-23" },
  { name: "Burns Night (Scotland)", date: "01-25" },
  { name: "Holocaust Remembrance Day", date: "01-27" },
  { name: "National Puzzle Day", date: "01-29" },
  { name: "National Hot Chocolate Day", date: "01-31" },

  // FEBRUARY
  { name: "Groundhog Day", date: "02-02" },
  { name: "World Cancer Day", date: "02-04" },
  { name: "National Pizza Day", date: "02-09" },
  { name: "Valentine's Day", date: "02-14" },
  { name: "Random Acts of Kindness Day", date: "02-17" },
  { name: "Presidents’ Day", date: "02-19" },
  { name: "World Thinking Day", date: "02-22" },
  { name: "Levi Strauss Day", date: "02-26" },
  { name: "Rare Disease Day", date: "02-28" },

  // MARCH
  { name: "St. David's Day", date: "03-01" },
  { name: "Read Across America Day", date: "03-02" },
  { name: "World Wildlife Day", date: "03-03" },
  { name: "International Women’s Day", date: "03-08" },
  { name: "Mario Day", date: "03-10" },
  { name: "Pi Day", date: "03-14" },
  { name: "St. Patrick’s Day", date: "03-17" },
  { name: "World Poetry Day", date: "03-21" },
  { name: "World Water Day", date: "03-22" },
  { name: "Earth Hour", date: "03-25" },
  { name: "Doctor’s Day", date: "03-30" },

  // APRIL
  { name: "April Fool’s Day", date: "04-01" },
  { name: "World Autism Awareness Day", date: "04-02" },
  { name: "World Health Day", date: "04-07" },
  { name: "Sibling Day", date: "04-10" },
  { name: "Cosmonautics Day", date: "04-12" },
  { name: "Songkran (Thai New Year)", date: "04-13" },
  { name: "Titanic Remembrance Day", date: "04-15" },
  { name: "World Heritage Day", date: "04-18" },
  { name: "Earth Day", date: "04-22" },
  { name: "World Book Day", date: "04-23" },
  { name: "DNA Day", date: "04-25" },
  { name: "International Jazz Day", date: "04-30" },

  // MAY
  { name: "May Day", date: "05-01" },
  { name: "Star Wars Day", date: "05-04" },
  { name: "Cinco de Mayo", date: "05-05" },
  { name: "Teacher Appreciation Day", date: "05-07" },
  { name: "Mother’s Day", date: "05-12" },
  { name: "International Nurses Day", date: "05-12" },
  { name: "Armed Forces Day", date: "05-18" },
  { name: "World Bee Day", date: "05-20" },
  { name: "Memorial Day", date: "05-27" },
  { name: "World No Tobacco Day", date: "05-31" },

  // JUNE
  { name: "Global Day of Parents", date: "06-01" },
  { name: "World Environment Day", date: "06-05" },
  { name: "Best Friends Day", date: "06-08" },
  { name: "World Blood Donor Day", date: "06-14" },
  { name: "Father’s Day", date: "06-16" },
  { name: "Juneteenth", date: "06-19" },
  { name: "Summer Solstice", date: "06-21" },
  { name: "World Music Day", date: "06-21" },
  { name: "Micro-, Small and Medium-sized Enterprises Day", date: "06-27" },

  // JULY
  { name: "Canada Day", date: "07-01" },
  { name: "Independence Day (USA)", date: "07-04" },
  { name: "World Chocolate Day", date: "07-07" },
  { name: "Video Game Day", date: "07-08" },
  { name: "Bastille Day", date: "07-14" },
  { name: "World Emoji Day", date: "07-17" },
  { name: "Nelson Mandela Day", date: "07-18" },
  { name: "Moon Day", date: "07-20" },
  { name: "Parents' Day", date: "07-28" },
  { name: "International Tiger Day", date: "07-29" },

  // AUGUST
  { name: "Friendship Day", date: "08-01" },
  { name: "International Beer Day", date: "08-02" },
  { name: "International Cat Day", date: "08-08" },
  { name: "Book Lovers Day", date: "08-09" },
  { name: "World Lion Day", date: "08-10" },
  { name: "Left-Handers Day", date: "08-13" },
  { name: "World Photography Day", date: "08-19" },
  { name: "World Humanitarian Day", date: "08-19" },
  { name: "Dog Appreciation Day", date: "08-26" },
  { name: "International Whale Shark Day", date: "08-30" },

  // SEPTEMBER
  { name: "Labor Day", date: "09-02" },
  { name: "International Day of Charity", date: "09-05" },
  { name: "Grandparents Day", date: "09-08" },
  { name: "World Suicide Prevention Day", date: "09-10" },
  { name: "Patriot Day (USA)", date: "09-11" },
  { name: "Video Games Day", date: "09-12" },
  { name: "Positive Thinking Day", date: "09-13" },
  { name: "International Day of Democracy", date: "09-15" },
  { name: "Talk Like a Pirate Day", date: "09-19" },
  { name: "World Peace Day", date: "09-21" },
  { name: "World Tourism Day", date: "09-27" },
  { name: "International Podcast Day", date: "09-30" },

  // OCTOBER
  { name: "International Coffee Day", date: "10-01" },
  { name: "World Teachers’ Day", date: "10-05" },
  { name: "Columbus Day", date: "10-14" },
  { name: "World Food Day", date: "10-16" },
  { name: "International Chefs Day", date: "10-20" },
  { name: "United Nations Day", date: "10-24" },
  { name: "World Pasta Day", date: "10-25" },
  { name: "Halloween", date: "10-31" },

  // NOVEMBER
  { name: "All Saints’ Day", date: "11-01" },
  { name: "Dia de los Muertos", date: "11-02" },
  { name: "Guy Fawkes Night", date: "11-05" },
  { name: "World Kindness Day", date: "11-13" },
  { name: "World Diabetes Day", date: "11-14" },
  { name: "International Students Day", date: "11-17" },
  { name: "Thanksgiving (USA)", date: "11-28" },
  { name: "Black Friday", date: "11-29" },
  { name: "Cyber Monday", date: "11-30" },

  // DECEMBER
  { name: "World AIDS Day", date: "12-01" },
  { name: "International Day of Persons with Disabilities", date: "12-03" },
  { name: "St. Nicholas Day", date: "12-06" },
  { name: "Human Rights Day", date: "12-10" },
  { name: "National Ugly Sweater Day", date: "12-15" },
  { name: "Winter Solstice", date: "12-21" },
  { name: "Christmas Eve", date: "12-24" },
  { name: "Christmas Day", date: "12-25" },
  { name: "Boxing Day", date: "12-26" },
  { name: "New Year's Eve", date: "12-31" },

  // ---------- CONTINUING TO 250 ----------
  { name: "National Donut Day", date: "06-07" },
  { name: "National Ice Cream Day", date: "07-21" },
  { name: "National Pancake Day", date: "09-26" },
  { name: "National Coffee Day", date: "09-29" },
  { name: "National Taco Day", date: "10-04" },
  { name: "National Sandwich Day", date: "11-03" },
  { name: "National Cookie Day", date: "12-04" },
  { name: "World Nutella Day", date: "02-05" },
  { name: "Pi Approximation Day", date: "07-22" },
  { name: "World Vegetarian Day", date: "10-01" },
  { name: "World Vegan Day", date: "11-01" },
  { name: "International Mountain Day", date: "12-11" },
  { name: "Global Handwashing Day", date: "10-15" },
  { name: "World Toilet Day", date: "11-19" },
  { name: "World Television Day", date: "11-21" },
  { name: "World Hello Day", date: "11-21" },
  { name: "World Soil Day", date: "12-05" },
  { name: "World Meteorological Day", date: "03-23" },
  { name: "World Tuna Day", date: "05-02" },
  { name: "World Press Freedom Day", date: "05-03" },
  { name: "World Turtle Day", date: "05-23" },
  { name: "World Oceans Day", date: "06-08" },
  { name: "World Population Day", date: "07-11" },
  { name: "World Mosquito Day", date: "08-20" },
  { name: "World Gratitude Day", date: "09-21" },
  { name: "World Smile Day", date: "10-07" },
  { name: "World Diabetes Day", date: "11-14" },
  { name: "International Civil Aviation Day", date: "12-07" },
  { name: "International Migrants Day", date: "12-18" },
  { name: "World Arabic Language Day", date: "12-18" },
  { name: "International Day of Happiness", date: "03-20" },
  { name: "World Health Day", date: "04-07" },
  { name: "International Day of Families", date: "05-15" },
  { name: "World Refugee Day", date: "06-20" },
  { name: "World Teachers Day", date: "10-05" },
  { name: "World AIDS Day", date: "12-01" },
  { name: "International Day of Yoga", date: "06-21" },
  { name: "World Lion Day", date: "08-10" },
  { name: "World Elephant Day", date: "08-12" },
  { name: "World Rabies Day", date: "09-28" },
  { name: "International Translation Day", date: "09-30" },
  { name: "World Habitat Day", date: "10-03" },
  { name: "World Statistics Day", date: "10-20" },
  { name: "International Day for Tolerance", date: "11-16" },
  { name: "International Day of Neutrality", date: "12-12" },
  { name: "World Braille Day", date: "01-04" },
  { name: "Data Privacy Day", date: "01-28" },
  { name: "Safer Internet Day", date: "02-06" },
  { name: "World Day of Social Justice", date: "02-20" },
  { name: "Zero Discrimination Day", date: "03-01" },
  { name: "World Wildlife Day", date: "03-03" },
  { name: "International Day of Forests", date: "03-21" },
  { name: "World Theatre Day", date: "03-27" },
  { name: "International Mother Earth Day", date: "04-22" },
  { name: "World Press Freedom Day", date: "05-03" },
  { name: "International Day of Families", date: "05-15" },
  { name: "World Day for Cultural Diversity", date: "05-21" },
  { name: "International Day of United Nations Peacekeepers", date: "05-29" },
  { name: "World Environment Day", date: "06-05" },
  { name: "World Day Against Child Labour", date: "06-12" },
  { name: "International Day of Cooperatives", date: "07-06" },
  { name: "World Hepatitis Day", date: "07-28" },
  { name: "International Youth Day", date: "08-12" },
  { name: "World Humanitarian Day", date: "08-19" },
  { name: "International Literacy Day", date: "09-08" },
  { name: "World Tourism Day", date: "09-27" },
  { name: "International Day for the Eradication of Poverty", date: "10-17" },
  { name: "World Development Information Day", date: "10-24" },
  { name: "International Day for Preventing Extremism", date: "12-12" },
];

// 📌 Utility function
function getClosestDay(days: { name: string; date: string }[]) {
  const today = new Date();
  const todayYear = today.getFullYear();

  // Normalize events to current/next year
  const upcoming = days.map((d) => {
    let eventDate = new Date(d.date);
    eventDate.setFullYear(todayYear);

    if (eventDate < today) {
      eventDate.setFullYear(todayYear + 1);
    }

    return { ...d, eventDate };
  });

  // Sort by soonest
  upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  const closest = upcoming[0];
  const daysLeft = Math.ceil(
    (closest.eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { ...closest, daysLeft };
}

const ConfettiCelebration = () => {
  const closest = useMemo(() => getClosestDay(SPECIAL_DAYS), []);

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-white/10 border border-white/20 ">
      <ItsConfettiCannon />
      <p className="text-lg font-semibold">
        🎊 Only <span className="text-purple-500">{closest.daysLeft}</span> days
        until <span className="text-blue-400">{closest.name}</span>! Throw some
        confetti!!
      </p>
    </div>
  );
};

export default ConfettiCelebration;
