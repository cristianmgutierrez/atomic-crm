import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

export const RichTextDisplay = ({
  html,
  className,
}: {
  html?: string | null;
  className?: string;
}) => {
  if (!html) return null;

  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ["img"],
    ADD_ATTR: ["src", "alt"],
  });

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_img]:max-w-full [&_img]:rounded-md",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
