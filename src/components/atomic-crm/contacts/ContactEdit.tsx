import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext, type MutationMode } from "ra-core";

import type { Contact } from "../types";
import { ContactAside } from "./ContactAside";
import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForEdit,
  defaultEmailJsonb,
  defaultPhoneJsonb,
  isoToDisplay,
  validateContactForm,
} from "./contactModel";

export const ContactEdit = ({
  mutationMode = "pessimistic",
}: {
  mutationMode?: MutationMode;
}) => (
  <EditBase
    redirect="show"
    transform={cleanupContactForEdit}
    mutationMode={mutationMode}
  >
    <ContactEditContent />
  </EditBase>
);

const normalizeContactArrayFields = (record: Contact) => ({
  ...record,
  email_jsonb:
    record.email_jsonb && record.email_jsonb.length > 0
      ? record.email_jsonb
      : defaultEmailJsonb,
  phone_jsonb:
    record.phone_jsonb && record.phone_jsonb.length > 0
      ? record.phone_jsonb
      : defaultPhoneJsonb,
  // Convert ISO dates (YYYY-MM-DD) to display format (DD/MM/AAAA)
  date_of_birth: isoToDisplay(record.date_of_birth),
  relationship_start_date: isoToDisplay(record.relationship_start_date),
});

const preventEnterSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
};

const ContactEditContent = () => {
  const { isPending, record } = useEditContext<Contact>();
  if (isPending || !record) return null;
  return (
    <div className="mt-2 flex gap-8" onKeyDown={preventEnterSubmit}>
      <Form
        validate={validateContactForm}
        className="flex flex-1 flex-col gap-4"
        record={normalizeContactArrayFields(record)}
      >
        <Card>
          <CardContent>
            <ContactInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>

      <ContactAside link="show" />
    </div>
  );
};
