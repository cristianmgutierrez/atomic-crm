import {
  EditBase,
  Form,
  useNotify,
  useTranslate,
  type Identifier,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { SaveButton } from "@/components/admin/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TaskDoneCheckbox } from "./TaskDoneCheckbox";
import { TaskFormContent } from "./TaskFormContent";

export const TaskEdit = ({
  open,
  close,
  taskId,
}: {
  taskId: Identifier;
  open: boolean;
  close: () => void;
}) => {
  const notify = useNotify();
  const translate = useTranslate();
  return (
    <Dialog open={open} onOpenChange={close}>
      {open && taskId && (
        <EditBase
          id={taskId}
          resource="tasks"
          className="mt-0"
          mutationOptions={{
            onSuccess: () => {
              close();
              notify("resources.tasks.updated", {
                type: "info",
                undoable: true,
              });
            },
          }}
          redirect={false}
        >
          <DialogContent className="lg:max-w-5xl overflow-y-auto overflow-x-hidden max-h-9/10 top-1/20 translate-y-0">
            <Form className="flex flex-col gap-4 min-w-0">
              <DialogHeader>
                <DialogTitle>
                  {translate("resources.tasks.action.edit")}
                </DialogTitle>
              </DialogHeader>
              <TaskFormContent />
              <DialogFooter className="w-full sm:justify-between items-center gap-4">
                <DeleteButton
                  mutationOptions={{
                    onSuccess: () => {
                      close();
                      notify("resources.tasks.deleted", {
                        type: "info",
                        undoable: true,
                      });
                    },
                  }}
                  redirect={false}
                />
                <div className="flex items-center gap-4">
                  <TaskDoneCheckbox />
                  <SaveButton label="ra.action.save" />
                </div>
              </DialogFooter>
            </Form>
          </DialogContent>
        </EditBase>
      )}
    </Dialog>
  );
};
