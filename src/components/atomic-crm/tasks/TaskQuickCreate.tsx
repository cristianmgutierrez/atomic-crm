import { useEffect, useState } from "react";
import { useRecordContext } from "ra-core";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { getTaskTypeIcon } from "./TaskTypeIconBar";
import { AddTask } from "./AddTask";
import type { Contact } from "../types";

export const TaskQuickCreate = () => {
  const record = useRecordContext<Contact>();
  const { taskTypes } = useConfigurationContext();
  const [type, setType] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (type && text.length >= 1 && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [type, text, dialogOpen]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setType(null);
      setText("");
    }
  };

  if (!record) return null;

  return (
    <div className="border rounded-lg p-3 bg-card mb-4">
      <ToggleGroup
        type="single"
        value={type ?? ""}
        onValueChange={(val) => setType(val || null)}
        className="flex flex-wrap gap-1 justify-start mb-3"
      >
        {taskTypes
          .filter((t) => t.value !== "none")
          .map((taskType) => {
            const Icon = getTaskTypeIcon(taskType.icon);
            return (
              <Tooltip key={taskType.value}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={taskType.value}
                    aria-label={taskType.label}
                    className={cn(
                      "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 min-w-[3rem] cursor-pointer",
                      type === taskType.value &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] leading-tight truncate max-w-[3.5rem]">
                      {taskType.label}
                    </span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{taskType.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
      </ToggleGroup>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Descreva a atividade..."
        className="resize-none text-sm min-h-[60px]"
        rows={2}
      />

      <AddTask
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        initialValues={{ type: type ?? undefined, text }}
      />
    </div>
  );
};
