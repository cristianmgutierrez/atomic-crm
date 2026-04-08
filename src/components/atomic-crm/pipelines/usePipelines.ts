import { useGetList } from "ra-core";
import type { Pipeline } from "../types";

export const usePipelines = () => {
  const { data, isPending } = useGetList<Pipeline>("pipelines", {
    sort: { field: "position", order: "ASC" },
    pagination: { page: 1, perPage: 100 },
  });

  return {
    pipelines: data ?? [],
    isPending,
  };
};
