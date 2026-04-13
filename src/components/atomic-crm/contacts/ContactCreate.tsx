import React from "react";
import { CreateBase, Form, useGetIdentity, type MutationMode } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import { ContactInputs } from "./ContactInputs";
import { FormToolbar } from "../layout/FormToolbar";
import {
  cleanupContactForCreate,
  CONTACT_FORM_MODE,
  getContactCreateDefaults,
  validateContactForm,
} from "./contactModel";

const preventEnterSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
};

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
            mode={CONTACT_FORM_MODE}
            defaultValues={getContactCreateDefaults(identity?.id)}
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
