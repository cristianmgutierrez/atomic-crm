import { useCallback } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Code,
  Undo,
  Redo,
} from "lucide-react";
import type { InputProps } from "ra-core";
import {
  useInput,
  FieldTitle,
  useResourceContext,
  useLocaleState,
} from "ra-core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import { FormError, FormField, FormLabel } from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export const RichTextInput = (props: RichTextInputProps) => {
  const {
    className,
    defaultValue,
    label,
    source,
    helperText,
    validate,
    disabled,
    readOnly,
    placeholder = "Adicionar anotacao...",
    ...rest
  } = props;

  const resource = useResourceContext(props);
  const [rawLocale = "en"] = useLocaleState();
  const locale = rawLocale.replace(
    /-(\w+)$/,
    (_, cc: string) => "-" + cc.toUpperCase(),
  );

  const { field, id, isRequired } = useInput({
    defaultValue: defaultValue ?? "",
    source,
    validate,
    disabled,
    readOnly,
    ...rest,
  });

  const editor = useEditor({
    extensions: [StarterKit, Image, Placeholder.configure({ placeholder })],
    content: field.value || "",
    editable: !disabled && !readOnly,
    editorProps: {
      attributes: {
        spellcheck: "true",
        lang: locale,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      field.onChange(html === "<p></p>" ? "" : html);
    },
  });

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (!editor) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    [editor],
  );

  if (!editor) return null;

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
      <div
        className={cn(
          "border rounded-md overflow-hidden",
          "focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        {!readOnly && (
          <div className="flex flex-wrap gap-0.5 border-b p-1 bg-muted/30">
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              aria-label="Negrito"
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() =>
                editor.chain().focus().toggleItalic().run()
              }
              aria-label="Italico"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 2 })}
              onPressedChange={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              aria-label="Titulo"
            >
              <Heading2 className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() =>
                editor.chain().focus().toggleBulletList().run()
              }
              aria-label="Lista"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() =>
                editor.chain().focus().toggleOrderedList().run()
              }
              aria-label="Lista numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("blockquote")}
              onPressedChange={() =>
                editor.chain().focus().toggleBlockquote().run()
              }
              aria-label="Citacao"
            >
              <Quote className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("codeBlock")}
              onPressedChange={() =>
                editor.chain().focus().toggleCodeBlock().run()
              }
              aria-label="Codigo"
            >
              <Code className="h-4 w-4" />
            </Toggle>
            <div className="ml-auto flex gap-0.5">
              <Toggle
                size="sm"
                pressed={false}
                onPressedChange={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                aria-label="Desfazer"
              >
                <Undo className="h-4 w-4" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={false}
                onPressedChange={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                aria-label="Refazer"
              >
                <Redo className="h-4 w-4" />
              </Toggle>
            </div>
          </div>
        )}
        <div onPaste={handlePaste}>
          <EditorContent
            editor={editor}
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] focus:outline-none",
              "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[80px]",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
              "[&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded-md",
            )}
          />
        </div>
      </div>
      <InputHelperText helperText={helperText} />
      <FormError />
    </FormField>
  );
};

export type RichTextInputProps = InputProps & {
  placeholder?: string;
};
