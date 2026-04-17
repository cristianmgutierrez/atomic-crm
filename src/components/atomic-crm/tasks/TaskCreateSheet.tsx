import {
  type Identifier,
  useGetIdentity,
  useGetOne,
  useGetRecordRepresentation,
  useNotify,
  useTranslate,
} from "ra-core";
import { CreateSheet } from "../misc/CreateSheet";
import { TaskFormContent } from "./TaskFormContent";
import { getTaskCreateDefaults } from "./taskModel";
import { useQueryClient } from "@tanstack/react-query";

export interface TaskCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact_id?: Identifier;
  initialType?: string;
  initialText?: string;
}

export const TaskCreateSheet = ({
  open,
  onOpenChange,
  contact_id,
  initialType,
  initialText,
}: TaskCreateSheetProps) => {
  const { identity } = useGetIdentity();
  const translate = useTranslate();
  const getContactRepresentation = useGetRecordRepresentation("contacts");

  const selectContact = contact_id == null;
  const { data: contact } = useGetOne(
    "contacts",
    { id: contact_id! },
    { enabled: !selectContact },
  );
  const queryClient = useQueryClient();
  const notify = useNotify();

  if (!identity) return null;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts", "getOne"] });
    notify("resources.tasks.added");
    onOpenChange(false);
  };

  return (
    <CreateSheet
      resource="tasks"
      title={
        <span className="text-xl font-semibold truncate pr-10">
          {!selectContact
            ? translate("resources.tasks.dialog.create_for", {
                name: getContactRepresentation(contact!),
              })
            : translate("resources.tasks.dialog.create")}
        </span>
      }
      redirect={false}
      record={{
        ...getTaskCreateDefaults(identity.id, contact_id),
        ...(initialType ? { type: initialType } : {}),
        ...(initialText ? { text: initialText } : {}),
      }}
      mutationOptions={{
        onSuccess: handleSuccess,
      }}
      open={open}
      onOpenChange={onOpenChange}
    >
      <TaskFormContent />
    </CreateSheet>
  );
};
