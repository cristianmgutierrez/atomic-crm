import { required, useTranslate } from "ra-core";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { usePipelines } from "../pipelines/usePipelines";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";

export const DealInputs = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-8">
      <DealInfoInputs />

      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <DealLinkedToInputs />
        <Separator orientation={isMobile ? "horizontal" : "vertical"} />
        <DealMiscInputs />
      </div>
    </div>
  );
};

const DealInfoInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <TextInput source="name" validate={required()} helperText={false} />
      <TextInput source="description" multiline rows={3} helperText={false} />
    </div>
  );
};

const DealLinkedToInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">
        {translate("resources.deals.inputs.linked_to")}
      </h3>
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteCompanyInput
          label="resources.deals.fields.company_id"
          validate={required()}
          modal
        />
      </ReferenceInput>

      <ReferenceArrayInput source="contact_ids" reference="contacts_summary">
        <AutocompleteArrayInput
          label="resources.deals.fields.contact_ids"
          optionText={contactOptionText}
          helperText={false}
          validate={required()}
        />
      </ReferenceArrayInput>
    </div>
  );
};

const DealMiscInputs = () => {
  const { dealCategories } = useConfigurationContext();
  const { pipelines } = usePipelines();
  const translate = useTranslate();
  const { setValue } = useFormContext();

  const selectedPipelineId = useWatch({ name: "pipeline_id" });

  // Derive stages from the selected pipeline
  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stageChoices = selectedPipeline?.stages ?? [];

  // When pipeline changes, reset the stage if it's not valid in the new pipeline
  useEffect(() => {
    if (!selectedPipeline) return;
    const currentStage = (
      document.querySelector('[name="stage"]') as HTMLInputElement | null
    )?.value;
    const stageValid = stageChoices.some((s) => s.value === currentStage);
    if (!stageValid && stageChoices.length > 0) {
      setValue("stage", stageChoices[0].value);
    }
  }, [selectedPipelineId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pipelineChoices = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">
        {translate("resources.deals.field_categories.misc")}
      </h3>

      {pipelineChoices.length > 1 && (
        <SelectInput
          source="pipeline_id"
          label="resources.deals.fields.pipeline_id"
          choices={pipelineChoices}
          optionText="name"
          optionValue="id"
          helperText={false}
          validate={required()}
        />
      )}

      <SelectInput
        source="category"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
        helperText={false}
      />
      <NumberInput
        source="amount"
        defaultValue={0}
        helperText={false}
        validate={required()}
      />
      <DateInput
        validate={required()}
        source="expected_closing_date"
        helperText={false}
        defaultValue={new Date().toISOString().split("T")[0]}
      />
      <SelectInput
        source="stage"
        choices={stageChoices}
        optionText="label"
        optionValue="value"
        defaultValue={stageChoices[0]?.value}
        helperText={false}
        validate={required()}
      />
    </div>
  );
};
