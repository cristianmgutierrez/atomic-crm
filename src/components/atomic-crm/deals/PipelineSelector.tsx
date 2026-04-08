import { useTranslate } from "ra-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useSelectedPipeline } from "../pipelines/useSelectedPipeline";

export const PipelineSelector = () => {
  const translate = useTranslate();
  const { pipelines, selectedPipeline, setSelectedPipelineId, isPending } =
    useSelectedPipeline();

  if (isPending || pipelines.length <= 1) return null;

  return (
    <Select
      value={selectedPipeline?.id?.toString() ?? ""}
      onValueChange={(val) => setSelectedPipelineId(Number(val))}
    >
      <SelectTrigger className="w-52">
        <SelectValue
          placeholder={translate("resources.deals.fields.pipeline_id")}
        />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
            {pipeline.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
