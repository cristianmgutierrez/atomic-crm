import { useMemo, useState } from "react";
import { icons, type LucideIcon } from "lucide-react";
import { useInput } from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getTaskTypeIcon } from "../tasks/taskTypeUtils";

const allIcons = icons as Record<string, LucideIcon>;
const allIconNames = Object.keys(allIcons);

export const TaskIconPickerInput = ({ source }: { source: string }) => {
  const { field } = useInput({ source });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const CurrentIcon = getTaskTypeIcon(field.value);

  const filtered = useMemo(() => {
    if (!search) return allIconNames.slice(0, 60);
    const q = search.toLowerCase();
    return allIconNames.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-9 h-9 shrink-0 p-0"
          title={field.value || "Escolher ícone"}
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <div className="h-56 overflow-y-auto">
          <div className="grid grid-cols-7 gap-1">
            {filtered.slice(0, 200).map((name) => {
              const Icon = allIcons[name];
              return (
                <Button
                  key={name}
                  type="button"
                  variant={field.value === name ? "default" : "ghost"}
                  className="w-8 h-8 p-0"
                  title={name}
                  onClick={() => {
                    field.onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum ícone encontrado.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
