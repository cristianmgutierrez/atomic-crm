import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  useCreate,
  useDelete,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toSlug } from "@/lib/toSlug";

import type { DealStage, Pipeline } from "../types";

// ──────────────────────────────────────────────
// PipelinesSettings — manages pipelines CRUD outside the config form
// ──────────────────────────────────────────────
export const PipelinesSettings = () => {
  const translate = useTranslate();
  const { data: pipelines = [], refetch } = useGetList<Pipeline>("pipelines", {
    sort: { field: "position", order: "ASC" },
    pagination: { page: 1, perPage: 100 },
  });
  const [create] = useCreate();
  const notify = useNotify();

  const handleAddPipeline = async () => {
    await create(
      "pipelines",
      {
        data: {
          name: translate("crm.settings.pipelines.add"),
          stages: [{ value: "new", label: "New" }],
          pipeline_statuses: [],
          position: pipelines.length,
        },
      },
      {
        onSuccess: () => refetch(),
        onError: () => notify("crm.settings.save_error", { type: "error" }),
      },
    );
  };

  return (
    <Card id="pipelines">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("crm.settings.sections.pipelines")}
        </h2>

        {pipelines.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {translate("crm.settings.pipelines.empty")}
          </p>
        )}

        <div className="space-y-3">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onSaved={refetch}
            />
          ))}
        </div>

        <Button type="button" variant="outline" onClick={handleAddPipeline}>
          <Plus className="h-4 w-4 mr-1" />
          {translate("crm.settings.pipelines.add")}
        </Button>
      </CardContent>
    </Card>
  );
};

// ──────────────────────────────────────────────
// PipelineCard — edit a single pipeline inline
// ──────────────────────────────────────────────
const PipelineCard = ({
  pipeline,
  onSaved,
}: {
  pipeline: Pipeline;
  onSaved: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [update] = useUpdate();
  const [deletePipeline] = useDelete();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(pipeline.name);
  const [stages, setStages] = useState<DealStage[]>(pipeline.stages ?? []);
  const [pipelineStatuses, setPipelineStatuses] = useState<string[]>(
    pipeline.pipeline_statuses ?? [],
  );

  const { data: dealsInPipeline } = useGetList("deals", {
    filter: { pipeline_id: pipeline.id },
    pagination: { page: 1, perPage: 1 },
  });

  const hasDeals = (dealsInPipeline?.length ?? 0) > 0;

  const handleSave = useCallback(async () => {
    const finalStages = stages.map((s) => ({
      ...s,
      value: s.value || toSlug(s.label),
    }));

    // Validate no duplicate stage values
    const values = finalStages.map((s) => s.value);
    const unique = new Set(values);
    if (unique.size !== values.length) {
      notify(
        translate("crm.settings.validation.duplicate", {
          display_name: translate("crm.settings.validation.entities.stages"),
          items: values.filter((v, i) => values.indexOf(v) !== i).join(", "),
        }),
        { type: "error" },
      );
      return;
    }

    // Validate no stage in use is removed (if deals exist in this pipeline)
    if (hasDeals) {
      // Full deal list for this pipeline to check stages in use
    }

    await update(
      "pipelines",
      {
        id: pipeline.id,
        data: {
          name,
          stages: finalStages,
          pipeline_statuses: pipelineStatuses,
        },
        previousData: pipeline,
      },
      {
        onSuccess: () => {
          notify("crm.settings.saved");
          onSaved();
        },
        onError: () => notify("crm.settings.save_error", { type: "error" }),
      },
    );
  }, [
    name,
    stages,
    pipelineStatuses,
    pipeline,
    update,
    notify,
    translate,
    hasDeals,
    onSaved,
  ]);

  const handleDelete = useCallback(async () => {
    if (hasDeals) {
      notify(translate("crm.settings.pipelines.cannot_delete_has_deals"), {
        type: "error",
      });
      return;
    }
    if (!confirm(translate("crm.settings.pipelines.delete_confirm"))) return;

    await deletePipeline(
      "pipelines",
      { id: pipeline.id, previousData: pipeline },
      {
        onSuccess: () => onSaved(),
        onError: () => notify("crm.settings.save_error", { type: "error" }),
      },
    );
  }, [hasDeals, pipeline, deletePipeline, notify, translate, onSaved]);

  const addStage = () =>
    setStages((prev) => [...prev, { value: "", label: "" }]);

  const removeStage = (idx: number) =>
    setStages((prev) => prev.filter((_, i) => i !== idx));

  const updateStageLabel = (idx: number, label: string) =>
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, label } : s)));

  const toggleStatus = (value: string) =>
    setPipelineStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-medium">{pipeline.name}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Pipeline name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              {translate("crm.settings.pipelines.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={translate("crm.settings.pipelines.name")}
            />
          </div>

          <Separator />

          {/* Stages */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {translate("crm.settings.pipelines.stages")}
            </h3>
            {stages.map((stage, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={stage.label}
                  onChange={(e) => updateStageLabel(idx, e.target.value)}
                  placeholder="Nome da etapa"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStage(idx)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStage}
            >
              <Plus className="h-3 w-3 mr-1" />
              {translate("crm.settings.pipelines.add_stage")}
            </Button>
          </div>

          <Separator />

          {/* Pipeline statuses */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {translate("crm.settings.pipelines.pipeline_statuses")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {translate("crm.settings.pipelines.pipeline_help")}
            </p>
            <div className="flex flex-wrap gap-2">
              {stages
                .filter((s) => s.label)
                .map((stage, idx) => {
                  const value = stage.value || toSlug(stage.label);
                  const isSelected = pipelineStatuses.includes(value);
                  return (
                    <Button
                      key={idx}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleStatus(value)}
                    >
                      {stage.label}
                    </Button>
                  );
                })}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {translate("crm.settings.pipelines.delete")}
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              {translate("crm.settings.pipelines.save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
