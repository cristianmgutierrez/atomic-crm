import { useMemo } from "react";
import { useTranslate } from "ra-core";

import { Card, CardContent } from "@/components/ui/card";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";

const SLOT_INTERVAL_CHOICES = [
  { id: 15, name: "15 min" },
  { id: 30, name: "30 min" },
  { id: 60, name: "60 min" },
];

const hourChoices = Array.from({ length: 24 }, (_, h) => ({
  id: h,
  name: `${h.toString().padStart(2, "0")}:00`,
}));

export const CalendarSettingsCard = () => {
  const translate = useTranslate();

  const weekStartsOnChoices = useMemo(
    () => [
      { id: 0, name: translate("crm.settings.agenda.sunday") },
      { id: 1, name: translate("crm.settings.agenda.monday") },
    ],
    [translate],
  );

  return (
    <Card id="agenda">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("crm.settings.sections.agenda")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            source="calendarSettings.slotInterval"
            label={translate("crm.settings.agenda.slot_interval")}
            choices={SLOT_INTERVAL_CHOICES}
            helperText={translate("crm.settings.agenda.slot_interval_help")}
          />
          <SelectInput
            source="calendarSettings.weekStartsOn"
            label={translate("crm.settings.agenda.week_starts_on")}
            choices={weekStartsOnChoices}
          />
          <SelectInput
            source="calendarSettings.dayStartHour"
            label={translate("crm.settings.agenda.day_start_hour")}
            choices={hourChoices}
          />
          <SelectInput
            source="calendarSettings.dayEndHour"
            label={translate("crm.settings.agenda.day_end_hour")}
            choices={hourChoices}
          />
          <NumberInput
            source="calendarSettings.defaultDurationMin"
            label={translate("crm.settings.agenda.default_duration")}
            min={5}
            step={5}
          />
        </div>
      </CardContent>
    </Card>
  );
};
