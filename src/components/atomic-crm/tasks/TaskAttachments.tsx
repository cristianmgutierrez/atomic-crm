import { Paperclip } from "lucide-react";

import type { AttachmentNote, Task } from "../types";

export const TaskAttachments = ({ task }: { task: Task }) => {
  if (!task.attachments || task.attachments.length === 0) {
    return null;
  }

  const imageAttachments = task.attachments.filter(
    (attachment: AttachmentNote) => isImageMimeType(attachment.type),
  );
  const otherAttachments = task.attachments.filter(
    (attachment: AttachmentNote) => !isImageMimeType(attachment.type),
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-4 gap-8">
          {imageAttachments.map((attachment: AttachmentNote, index: number) => (
            <div key={index}>
              <a
                href={attachment.src}
                title={attachment.title}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={attachment.src}
                  alt={attachment.title}
                  className="w-[200px] h-[100px] object-cover cursor-pointer object-left border border-border"
                />
              </a>
            </div>
          ))}
        </div>
      )}
      {otherAttachments.length > 0 &&
        otherAttachments.map((attachment: AttachmentNote, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <a
              href={attachment.src}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              {attachment.title}
            </a>
          </div>
        ))}
    </div>
  );
};

const isImageMimeType = (mimeType?: string): boolean => {
  if (!mimeType) {
    return false;
  }
  return mimeType.startsWith("image/");
};
