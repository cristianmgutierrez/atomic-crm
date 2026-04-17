import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

export const TaskDoneCheckbox = () => {
  const { setValue } = useFormContext();
  const doneDate = useWatch({ name: "done_date" });
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <Checkbox
        checked={!!doneDate}
        onCheckedChange={(v) =>
          setValue("done_date", v ? new Date().toISOString() : null)
        }
      />
      Marcar como feito
    </label>
  );
};
