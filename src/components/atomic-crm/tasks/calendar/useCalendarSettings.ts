import { useConfigurationContext } from "../../root/ConfigurationContext";

export const useCalendarSettings = () =>
  useConfigurationContext().calendarSettings;
