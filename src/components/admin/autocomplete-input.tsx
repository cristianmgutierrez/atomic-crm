/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { isValidElement, useCallback, useRef } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormError,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  ChoicesProps,
  InputProps,
  SupportCreateSuggestionOptions,
} from "ra-core";
import {
  useChoices,
  useChoicesContext,
  useGetRecordRepresentation,
  useInput,
  useTranslate,
  FieldTitle,
  useEvent,
  useSupportCreateSuggestion,
} from "ra-core";
import { InputHelperText } from "./input-helper-text";
import { PopoverProps } from "@radix-ui/react-popover";

/**
 * Form control that lets users choose a value from a list using a dropdown with autocompletion.
 *
 * This input allows editing scalar values with a searchable dropdown interface. It supports creating
 * new choices on the fly and works seamlessly inside ReferenceInput for editing foreign key relationships.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/autocompleteinput/ AutocompleteInput documentation}
 *
 * @example
 * import {
 *   Create,
 *   SimpleForm,
 *   AutocompleteInput,
 *   ReferenceInput,
 * } from '@/components/admin';
 *
 * const PostCreate = () => (
 *   <Create>
 *     <SimpleForm>
 *       <AutocompleteInput
 *         source="category"
 *         choices={[
 *           { id: 'tech', name: 'Tech' },
 *           { id: 'lifestyle', name: 'Lifestyle' },
 *           { id: 'people', name: 'People' },
 *         ]}
 *       />
 *       <ReferenceInput label="Author" source="author_id" reference="authors">
 *         <AutocompleteInput />
 *       </ReferenceInput>
 *     </SimpleForm>
 *   </Create>
 * );
 */
export const AutocompleteInput = (
  props: Omit<InputProps, "source"> &
    Omit<SupportCreateSuggestionOptions, "handleChange" | "filter"> &
    Partial<Pick<InputProps, "source">> &
    ChoicesProps & {
      className?: string;
      disableValue?: string;
      filterToQuery?: (searchText: string) => any;
      translateChoice?: boolean;
      placeholder?: string;
      inputText?:
        | React.ReactNode
        | ((option: any | undefined) => React.ReactNode);
    } & Pick<PopoverProps, "modal">,
) => {
  const {
    filterToQuery = DefaultFilterToQuery,
    inputText,
    create,
    createValue,
    createLabel,
    createHintValue,
    createItemLabel,
    onCreate,
    optionText,
    modal,
  } = props;
  const {
    allChoices = [],
    source,
    resource,
    isFromReference,
    setFilters,
  } = useChoicesContext(props);
  const { id, field, isRequired } = useInput({ ...props, source });
  const uniqueId = React.useId();
  const translate = useTranslate();
  const { placeholder = translate("ra.action.search", { _: "Search..." }) } =
    props;

  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const { getChoiceText, getChoiceValue } = useChoices({
    optionText:
      props.optionText ?? (isFromReference ? getRecordRepresentation : "name"),
    optionValue: props.optionValue ?? "id",
    disableValue: props.disableValue,
    translateChoice: props.translateChoice ?? !isFromReference,
  });

  const [filterValue, setFilterValue] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const [open, setOpen] = React.useState(false);
  const selectedChoice = allChoices.find(
    (choice) => getChoiceValue(choice) === field.value,
  );

  const getInputText = useCallback(
    (selectedChoice: any) => {
      if (typeof inputText === "function") {
        return inputText(selectedChoice);
      }
      if (inputText !== undefined) {
        return inputText;
      }
      return getChoiceText(selectedChoice);
    },
    [inputText, getChoiceText],
  );

  const handleOpenChange = useEvent((isOpen: boolean) => {
    setOpen(isOpen);
    // Reset the filter when the popover is closed
    if (!isOpen) {
      setFilterValue("");
      setFilters(filterToQuery(""));
    }
  });

  const handleChange = useCallback(
    (choice: any) => {
      if (field.value === getChoiceValue(choice) && !isRequired) {
        field.onChange("");
        setFilterValue("");
        if (isFromReference) {
          setFilters(filterToQuery(""));
        }
        setOpen(false);
        return;
      }
      field.onChange(getChoiceValue(choice));
      setFilterValue("");
      setOpen(false);
    },
    [
      field,
      getChoiceValue,
      isRequired,
      isFromReference,
      setFilters,
      filterToQuery,
    ],
  );

  const {
    getCreateItem,
    handleChange: handleChangeWithCreateSupport,
    createElement,
    getOptionDisabled,
  } = useSupportCreateSuggestion({
    create,
    createLabel,
    createValue,
    createHintValue,
    createItemLabel,
    onCreate,
    handleChange,
    optionText,
    filter: filterValue,
  });

  const createItem =
    (create || onCreate) && (filterValue !== "" || createLabel)
      ? getCreateItem(filterValue)
      : null;
  let finalChoices = allChoices;

  if (createItem) {
    finalChoices = [...finalChoices, createItem];
  }

  // Inline mode: Input as anchor, popover opens on focus/typing
  const inlineMode = !modal;
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInlineInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterValue(value);
    if (isFromReference) {
      setFilters(filterToQuery(value));
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollTo(0, 0);
    });
    if (!open) setOpen(true);
  };

  const handleInlineFocus = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const handleInlineBlur = () => {
    // Delay closing so item clicks register first
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setFilterValue("");
      if (isFromReference) setFilters(filterToQuery(""));
    }, 150);
  };

  const handleInlineClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    field.onChange("");
    setFilterValue("");
    if (isFromReference) setFilters(filterToQuery(""));
  };

  // Get display text for the selected choice (string only for inline input)
  const getSelectedText = useCallback(
    (choice: any): string => {
      const text = getChoiceText(choice);
      if (typeof text === "string") return text;
      // Fallback for React element optionText (e.g. contactOptionText):
      // try inputText prop, then common record field names
      if (typeof inputText === "function") {
        const result = inputText(choice);
        if (typeof result === "string") return result;
      }
      // Extract from common fields (name, first_name/last_name, label)
      if (choice?.name) return choice.name;
      const fullName = [choice?.first_name, choice?.last_name]
        .filter(Boolean)
        .join(" ");
      if (fullName) return fullName;
      return choice?.label ?? String(choice?.id ?? "");
    },
    [getChoiceText, inputText],
  );

  if (inlineMode) {
    const inlineInputValue = open
      ? filterValue
      : selectedChoice
        ? getSelectedText(selectedChoice)
        : "";

    return (
      <>
        <FormField className={props.className} id={id} name={source}>
          {props.label !== false && (
            <FormLabel id={uniqueId}>
              <FieldTitle
                label={props.label}
                source={props.source ?? source}
                resource={resource}
                isRequired={isRequired}
              />
            </FormLabel>
          )}
          <FormControl>
            <Popover open={open} onOpenChange={handleOpenChange}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Input
                    id={id}
                    aria-labelledby={uniqueId}
                    value={inlineInputValue}
                    onChange={handleInlineInputChange}
                    onFocus={handleInlineFocus}
                    onBlur={handleInlineBlur}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={cn("w-full", selectedChoice && !open && "pr-8")}
                  />
                  {selectedChoice && !open && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={handleInlineClear}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar seleção"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </PopoverAnchor>
              <PopoverContent
                className="w-full max-w-(--radix-popover-anchor-width) p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <Command shouldFilter={!isFromReference}>
                  <CommandList ref={listRef}>
                    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                    <CommandGroup>
                      {finalChoices.map((choice) => {
                        const isCreateItem =
                          !!createItem && choice?.id === createItem.id;
                        const disabled = getOptionDisabled(choice);
                        const choiceText = getChoiceText(
                          isCreateItem ? createItem : choice,
                        );

                        return (
                          <CommandItem
                            key={getChoiceValue(choice)}
                            value={
                              isCreateItem
                                ? `?${filterValue}?`
                                : getChoiceValue(choice)
                            }
                            keywords={
                              isCreateItem || isValidElement(choiceText)
                                ? undefined
                                : [choiceText]
                            }
                            onMouseDown={(e) => e.preventDefault()}
                            onSelect={() => {
                              if (closeTimerRef.current) {
                                clearTimeout(closeTimerRef.current);
                                closeTimerRef.current = null;
                              }
                              handleChangeWithCreateSupport(choice);
                            }}
                            disabled={disabled}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === getChoiceValue(choice)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {choiceText}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormControl>
          <InputHelperText helperText={props.helperText} />
          <FormError />
        </FormField>
        {createElement}
      </>
    );
  }

  // Original modal/button mode
  return (
    <>
      <FormField className={props.className} id={id} name={source}>
        {props.label !== false && (
          <FormLabel id={uniqueId}>
            <FieldTitle
              label={props.label}
              source={props.source ?? source}
              resource={resource}
              isRequired={isRequired}
            />
          </FormLabel>
        )}
        <FormControl>
          <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-labelledby={uniqueId}
                className="w-full justify-between h-auto py-1.75 font-normal"
              >
                {selectedChoice ? (
                  getInputText(selectedChoice)
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-(--radix-popover-trigger-width) p-0">
              {/* We handle the filtering ourselves */}
              <Command shouldFilter={!isFromReference}>
                <CommandInput
                  placeholder={placeholder}
                  value={filterValue}
                  onValueChange={(filter) => {
                    setFilterValue(filter);
                    requestAnimationFrame(() => {
                      listRef.current?.scrollTo(0, 0);
                    });
                    if (isFromReference) {
                      setFilters(filterToQuery(filter));
                    }
                  }}
                />
                <CommandList ref={listRef}>
                  <CommandEmpty>No matching item found.</CommandEmpty>
                  <CommandGroup>
                    {finalChoices.map((choice) => {
                      const isCreateItem =
                        !!createItem && choice?.id === createItem.id;
                      const disabled = getOptionDisabled(choice);

                      const choiceText = getChoiceText(
                        isCreateItem ? createItem : choice,
                      );

                      return (
                        <CommandItem
                          key={getChoiceValue(choice)}
                          value={
                            isCreateItem
                              ? `?${filterValue}?`
                              : getChoiceValue(choice)
                          }
                          keywords={
                            isCreateItem || isValidElement(choiceText)
                              ? undefined
                              : [choiceText]
                          }
                          onSelect={() => handleChangeWithCreateSupport(choice)}
                          disabled={disabled}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === getChoiceValue(choice)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {choiceText}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormControl>
        <InputHelperText helperText={props.helperText} />
        <FormError />
      </FormField>
      {createElement}
    </>
  );
};

const DefaultFilterToQuery = (searchText: string) => ({ q: searchText });
