import { useState } from "react";
import { useRecordContext, useUpdate } from "ra-core";
import { Check, Copy, Pencil } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact } from "../types";

export type EditableCellConfig = {
  /** Optional mask applied on every keystroke (text inputs only) */
  maskFn?: (v: string) => string;
  /** Transform the record's raw value → input display string */
  toInput?: (recordValue: unknown) => string;
  /** Transform the input string → value to persist */
  toSave?: (inputValue: string) => unknown;
  /** For complex fields (JSONB arrays), provide the full data object to save */
  getSaveData?: (record: Contact, inputValue: string) => Partial<Contact>;
} & (
  | { inputType: "text" }
  | { inputType: "select"; choices: { id: string; name: string }[] }
);

interface EditableCellProps {
  source: string;
  config: EditableCellConfig;
  children?: React.ReactNode;
  /** Text to copy to clipboard; if omitted, the copy button is not shown */
  copyValue?: string | null;
}

export const EditableCell = ({
  source,
  config,
  children,
  copyValue,
}: EditableCellProps) => {
  const record = useRecordContext<Contact>();
  const [update, { isPending }] = useUpdate();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!record) return <>{children}</>;

  const getInitialValue = () => {
    const raw = record[source as keyof Contact];
    if (config.toInput) return config.toInput(raw);
    return raw != null ? String(raw) : "";
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue(getInitialValue());
    setSaveError(null);
    setOpen(true);
  };

  const handleSave = () => {
    let saveData: Partial<Contact>;
    if (config.getSaveData) {
      saveData = config.getSaveData(record, inputValue);
    } else {
      const val = config.toSave
        ? config.toSave(inputValue)
        : inputValue.trim() === ""
          ? null
          : inputValue;
      saveData = { [source]: val } as Partial<Contact>;
    }

    update(
      "contacts",
      { id: record.id, data: saveData, previousData: record },
      {
        onSuccess: () => {
          setOpen(false);
          setSaveError(null);
        },
        onError: () => {
          setSaveError("Erro ao salvar");
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = config.maskFn ? config.maskFn(e.target.value) : e.target.value;
    setInputValue(val);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className="group relative flex items-center gap-1 min-w-0 w-full"
          onClick={(e) => {
            if (open) e.stopPropagation();
          }}
        >
          <span className="flex-1 truncate">{children}</span>
          {copyValue && (
            <button
              type="button"
              aria-label="Copiar"
              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 p-0.5 rounded transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
          <button
            type="button"
            aria-label="Editar"
            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 p-0.5 rounded transition-opacity"
            onClick={handleOpen}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          {config.inputType === "text" ? (
            <Input
              autoFocus
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          ) : (
            <Select value={inputValue} onValueChange={setInputValue}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.choices.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {saveError && <p className="text-destructive text-xs">{saveError}</p>}
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "..." : "Salvar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
