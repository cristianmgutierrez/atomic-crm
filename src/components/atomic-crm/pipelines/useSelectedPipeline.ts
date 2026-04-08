import { useStore } from "ra-core";
import { useMemo } from "react";
import { usePipelines } from "./usePipelines";
import type { Pipeline } from "../types";

const SELECTED_PIPELINE_KEY = "selectedPipelineId";

export const useSelectedPipeline = () => {
  const { pipelines, isPending } = usePipelines();
  const [storedId, setStoredId] = useStore<number | null>(
    SELECTED_PIPELINE_KEY,
    null,
  );

  const selectedPipeline = useMemo((): Pipeline | null => {
    if (!pipelines.length) return null;
    // Try stored ID first, fall back to first pipeline
    const found = storedId
      ? pipelines.find((p) => p.id === storedId)
      : undefined;
    return found ?? pipelines[0];
  }, [pipelines, storedId]);

  const setSelectedPipelineId = (id: number) => {
    setStoredId(id);
  };

  return {
    selectedPipeline,
    setSelectedPipelineId,
    pipelines,
    isPending,
  };
};
