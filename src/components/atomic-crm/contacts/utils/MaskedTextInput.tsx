import type { InputProps } from "ra-core";
import { useInput, useResourceContext, FieldTitle } from "ra-core";
import {
  FormControl,
  FormError,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import { Input } from "@/components/ui/input";
import { InputHelperText } from "@/components/admin/input-helper-text";
import type { ChangeEvent } from "react";

export type MaskedTextInputProps = InputProps & {
  maskFn: (value: string) => string;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "onChange">;

/**
 * TextInput variant that applies a mask function on every change.
 * The stored value is the masked string (e.g. "123.456.789-00").
 */
export const MaskedTextInput = (props: MaskedTextInputProps) => {
  const resource = useResourceContext(props);
  const {
    label,
    source,
    className,
    inputClassName,
    helperText,
    maskFn,
    validate: _v,
    format: _f,
    ...rest
  } = props;

  const { id, field, isRequired } = useInput(props);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = maskFn(e.target.value);
    field.onChange(masked);
  };

  return (
    <FormField id={id} className={className} name={field.name}>
      {label !== false && (
        <FormLabel>
          <FieldTitle
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FormLabel>
      )}
      <FormControl>
        <Input
          {...rest}
          name={field.name}
          value={field.value ?? ""}
          onBlur={field.onBlur}
          ref={field.ref}
          onChange={handleChange}
          className={inputClassName}
        />
      </FormControl>
      <InputHelperText helperText={helperText} />
      <FormError />
    </FormField>
  );
};
