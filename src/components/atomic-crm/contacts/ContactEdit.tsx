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
import { maskCurrency } from "./utils/masks";

const toMaskedCurrency = (v: number | string | null | undefined): string => {
  if (v == null || v === "") return "";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "";
  return maskCurrency(Math.round(num * 100).toString());
};

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
  // Convert numeric DB values to masked currency strings for display
  monthly_income: toMaskedCurrency(record.monthly_income),
  declared_wealth: toMaskedCurrency(record.declared_wealth),
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
        mode="onBlur"
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
