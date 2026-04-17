import { Plus } from "lucide-react";
import {
  CreateBase,
  Form,
  useDataProvider,
  useGetIdentity,
  useGetRecordRepresentation,
  useNotify,
  useRecordContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SaveButton } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { TaskDoneCheckbox } from "./TaskDoneCheckbox";
import { TaskFormContent } from "./TaskFormContent";
import { getTaskCreateDefaults } from "./taskModel";
import { foreignKeyMapping } from "../notes/foreignKeyMapping";

export const AddTask = ({
  selectContact,
  display = "chip",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialValues,
}: {
  selectContact?: boolean;
  display?: "chip" | "icon";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValues?: { type?: string; text?: string };
}) => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const [update] = useUpdate();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const translate = useTranslate();
  const contact = useRecordContext();
  const getContactRepresentation = useGetRecordRepresentation("contacts");

  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const handleSuccess = async (data: any) => {
    const contactId = data[foreignKeyMapping["contacts"]];
    if (contactId) {
      const { data: contactData } = await dataProvider.getOne("contacts", {
        id: contactId,
      });
      if (contactData) {
        await update("contacts", {
          id: contactId,
          data: { last_seen: new Date().toISOString() },
          previousData: contactData,
        });
        queryClient.invalidateQueries({ queryKey: ["contacts", "getOne"] });
      }
    }
    notify("resources.tasks.added");
    setOpen(false);
  };

  if (!identity) return null;

  const record = {
    ...getTaskCreateDefaults(identity.id, contact?.id),
    ...initialValues,
  };

  return (
    <>
      {!isControlled &&
        (display === "icon" ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 cursor-pointer"
                  onClick={() => setOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {translate("resources.tasks.action.create")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="my-2">
            <Button
              variant="outline"
              className="h-6 cursor-pointer"
              onClick={() => setOpen(true)}
              size="sm"
            >
              <Plus className="w-4 h-4" />
              {translate("resources.tasks.action.add")}
            </Button>
          </div>
        ))}

      <CreateBase
        resource="tasks"
        record={record}
        mutationOptions={{ onSuccess: handleSuccess }}
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="lg:max-w-2xl overflow-y-auto overflow-x-hidden max-h-9/10 top-1/20 translate-y-0">
            <Form className="flex flex-col gap-4 min-w-0">
              <DialogHeader>
                <DialogTitle>
                  {!selectContact
                    ? translate("resources.tasks.dialog.create_for", {
                        name: getContactRepresentation(contact!),
                      })
                    : translate("resources.tasks.dialog.create")}
                </DialogTitle>
              </DialogHeader>
              <TaskFormContent />
              <DialogFooter className="w-full justify-between items-center">
                <TaskDoneCheckbox />
                <SaveButton />
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </CreateBase>
    </>
  );
};
