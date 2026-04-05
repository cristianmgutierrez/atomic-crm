import React from "react";
import { CreateBase, Form, useGetIdentity, type MutationMode } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForCreate,
  defaultEmailJsonb,
  defaultPhoneJsonb,
  validateContactForm,
} from "./contactModel";

const preventEnterSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
};

const todayDisplay = (() => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
})();

export const ContactCreate = ({
  mutationMode = "pessimistic",
}: {
  mutationMode?: MutationMode;
}) => {
  const { identity } = useGetIdentity();

  return (
    <CreateBase
      redirect="show"
      transform={cleanupContactForCreate}
      mutationMode={mutationMode}
    >
      <div className="mt-2 flex lg:mr-72" onKeyDown={preventEnterSubmit}>
        <div className="flex-1">
          <Form
            validate={validateContactForm}
            defaultValues={{
              sales_id: identity?.id,
              email_jsonb: defaultEmailJsonb,
              phone_jsonb: defaultPhoneJsonb,
              country: "Brasil",
              person_type: "PF",
              cross_sell_opportunities: [],
              relationship_start_date: todayDisplay,
            }}
          >
            <Card>
              <CardContent>
                <ContactInputs />
                <FormToolbar />
              </CardContent>
            </Card>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
