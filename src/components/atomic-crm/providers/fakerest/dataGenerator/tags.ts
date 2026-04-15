import type { Db } from "./types";

const tags = [
  { id: 0, name: "football-fan", color: "#3a6b5e" },
  { id: 1, name: "holiday-card", color: "#4a5e80" },
  { id: 2, name: "influencer", color: "#6b4a5e" },
  { id: 3, name: "manager", color: "#5e6b3a" },
  { id: 4, name: "musician", color: "#4a806b" },
  { id: 5, name: "vip", color: "#805e4a" },
];

export const generateTags = (_: Db) => {
  return [...tags];
};
