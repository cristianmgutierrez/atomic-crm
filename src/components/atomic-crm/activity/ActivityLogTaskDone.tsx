import { useGetIdentity, useRecordContext, useTranslate } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar } from "../contacts/Avatar";
import { RelativeDate } from "../misc/RelativeDate";
import { useGetSalesName } from "../sales/useGetSalesName";
import type { ActivityTaskDone, Contact } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { ActivityLogNote } from "./ActivityLogNote";

type ActivityLogTaskDoneProps = {
  activity: ActivityTaskDone;
};

function ContactAvatar() {
  const record = useRecordContext<Contact>();
  return <Avatar width={20} height={20} record={record} />;
}

export function ActivityLogTaskDone({ activity }: ActivityLogTaskDoneProps) {
  const context = useActivityLogContext();
  const isMobile = useIsMobile();
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { task } = activity;
  const isCurrentUser = activity.sales_id === identity?.id;
  const salesName = useGetSalesName(activity.sales_id, {
    enabled: !isCurrentUser,
  });
  const link = isMobile ? false : `/contacts/${task.contact_id}/show`;

  return (
    <ActivityLogNote
      header={
        <div className="flex items-start gap-2 w-full">
          <ReferenceField
            source="contact_id"
            reference="contacts"
            record={task}
          >
            <ContactAvatar />
          </ReferenceField>

          <span className="text-muted-foreground text-sm flex-grow">
            {translate(
              isCurrentUser
                ? "crm.activity.you_completed_task"
                : "crm.activity.completed_task",
              {
                name: salesName,
                _: `${salesName ?? "Voce"} concluiu uma tarefa`,
              },
            )}{" "}
            <ReferenceField
              source="contact_id"
              reference="contacts"
              record={task}
            >
              <TextField source="first_name" /> <TextField source="last_name" />
            </ReferenceField>
            {context !== "company" && (
              <>
                {" "}
                <RelativeDate date={activity.date} />
              </>
            )}
          </span>

          {context === "company" && (
            <span className="text-muted-foreground text-sm">
              <RelativeDate date={activity.date} />
            </span>
          )}
        </div>
      }
      text={task.text ?? task.notes ?? ""}
      link={link}
    />
  );
}
