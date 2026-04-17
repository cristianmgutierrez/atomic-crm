import type { ReactNode } from "react";
import type { InputProps } from "ra-core";
import {
  useDataProvider,
  useGetIdentity,
  useListContext,
  useTranslate,
} from "ra-core";
import { matchPath, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { GetListResult } from "ra-core";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { FilterButton } from "@/components/admin/filter-form";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";

import type { Deal } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { useSelectedPipeline } from "../pipelines/useSelectedPipeline";
import { TopToolbar } from "../layout/TopToolbar";
import { DealArchivedList } from "./DealArchivedList";
import { DealCreate } from "./DealCreate";
import { DealEdit } from "./DealEdit";
import { DealEmpty } from "./DealEmpty";
import { DealListContent } from "./DealListContent";
import { DealShow } from "./DealShow";
import { OnlyMineInput } from "./OnlyMineInput";
import { PipelineSelector } from "./PipelineSelector";

const DealList = () => {
  const { identity } = useGetIdentity();
  const { dealCategories } = useConfigurationContext();
  const { selectedPipeline } = useSelectedPipeline();
  const translate = useTranslate();

  if (!identity) return null;

  const dealFilters = [
    <SearchInput source="q" alwaysOn />,
    <ReferenceInput source="company_id" reference="companies">
      <AutocompleteInput
        label={false}
        placeholder={translate("resources.deals.fields.company_id")}
      />
    </ReferenceInput>,
    <WrapperField source="category" label="resources.deals.fields.category">
      <SelectInput
        source="category"
        label={false}
        emptyText="resources.deals.fields.category"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
      />
    </WrapperField>,
    <OnlyMineInput source="sales_id" alwaysOn />,
  ];

  const pipelineFilter = selectedPipeline
    ? { pipeline_id: selectedPipeline.id }
    : {};

  return (
    <List
      perPage={100}
      filter={{ "archived_at@is": null, ...pipelineFilter }}
      title={false}
      sort={{ field: "index", order: "DESC" }}
      filters={dealFilters}
      actions={<DealActions />}
      pagination={null}
    >
      <DealLayout />
    </List>
  );
};

const DealLayout = () => {
  const location = useLocation();
  const matchCreate = matchPath("/deals/create", location.pathname);
  const matchShow = matchPath("/deals/:id/show", location.pathname);
  const matchEdit = matchPath("/deals/:id", location.pathname);

  const { data: allDeals, isPending, filterValues } = useListContext<Deal>();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  const handleDealCreateSuccess = async (deal: Deal) => {
    if (!allDeals) return;
    const deals = allDeals.filter(
      (d: Deal) => d.stage === deal.stage && d.id !== deal.id,
    );
    await Promise.all(
      deals.map(async (oldDeal) =>
        dataProvider.update("deals", {
          id: oldDeal.id,
          data: { index: oldDeal.index + 1 },
          previousData: oldDeal,
        }),
      ),
    );
    const dealsById = deals.reduce(
      (acc, d) => ({
        ...acc,
        [d.id]: { ...d, index: d.index + 1 },
      }),
      {} as { [key: string]: Deal },
    );
    const now = Date.now();
    queryClient.setQueriesData<GetListResult | undefined>(
      { queryKey: ["deals", "getList"] },
      (res) => {
        if (!res) return res;
        return {
          ...res,
          data: res.data.map((d: Deal) => dealsById[d.id] || d),
        };
      },
      { updatedAt: now },
    );
  };

  if (isPending) return null;
  if (!allDeals?.length && !hasFilters)
    return (
      <>
        <DealEmpty>
          <DealShow open={!!matchShow} id={matchShow?.params.id} />
          <DealArchivedList />
        </DealEmpty>
      </>
    );

  return (
    <div className="w-full">
      <DealListContent />
      <DealArchivedList />
      <DealCreate open={!!matchCreate} onSuccess={handleDealCreateSuccess} />
      <DealEdit open={!!matchEdit && !matchCreate} id={matchEdit?.params.id} />
      <DealShow open={!!matchShow} id={matchShow?.params.id} />
    </div>
  );
};

const DealActions = () => (
  <TopToolbar>
    <PipelineSelector />
    <FilterButton />
    <ExportButton />
    <CreateButton label="resources.deals.action.new" />
  </TopToolbar>
);

/**
 *
 * Used so that label of filters can be inferred for the select display,
 * but not be displayed when showing the input.
 */
const WrapperField = ({ children }: InputProps & { children: ReactNode }) =>
  children;

export default DealList;
