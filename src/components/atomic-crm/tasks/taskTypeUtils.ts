import { icons, CircleDot, type LucideIcon } from "lucide-react";

export const getTaskTypeIcon = (iconName?: string): LucideIcon => {
  if (!iconName) return CircleDot;
  return (icons as Record<string, LucideIcon>)[iconName] ?? CircleDot;
};
