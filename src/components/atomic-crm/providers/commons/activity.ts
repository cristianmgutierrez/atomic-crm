import type { DataProvider, Identifier } from "ra-core";

import {
  COMPANY_CREATED,
  CONTACT_CREATED,
  DEAL_CREATED,
  TASK_CREATED,
  TASK_DONE,
} from "../../consts";
import type { Activity, Company, Contact, Deal, Task } from "../../types";

// FIXME: Requires multiple large queries to get the latest activities.
// Replace with a server-side view or a custom API endpoint.
export async function getActivityLog(
  dataProvider: DataProvider,
  companyId?: Identifier,
  salesId?: Identifier,
) {
  const companyFilter = {} as any;
  if (companyId) {
    companyFilter.id = companyId;
  } else if (salesId) {
    companyFilter["sales_id@in"] = `(${salesId})`;
  }

  const filter = {} as any;
  if (companyId) {
    filter.company_id = companyId;
  } else if (salesId) {
    filter["sales_id@in"] = `(${salesId})`;
  }

  const [newCompanies, newContacts, newDeals, newTaskActivities] =
    await Promise.all([
      getNewCompanies(dataProvider, companyFilter),
      getNewContacts(dataProvider, filter),
      getNewDeals(dataProvider, filter),
      getTaskActivities(dataProvider, filter),
    ]);
  return (
    [...newCompanies, ...newContacts, ...newDeals, ...newTaskActivities]
      // sort by date desc
      .sort(
        (a, b) =>
          (a.date || new Date(0).toISOString()).localeCompare(
            b.date || new Date(0).toISOString(),
          ) * -1,
      )
      // limit to 250 activities
      .slice(0, 250)
  );
}

const getNewCompanies = async (
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> => {
  const { data: companies } = await dataProvider.getList<Company>("companies", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "created_at", order: "DESC" },
  });
  return companies.map((company) => ({
    id: `company.${company.id}.created`,
    type: COMPANY_CREATED,
    company_id: company.id,
    company,
    sales_id: company.sales_id,
    date: company.created_at,
  }));
};

async function getNewContacts(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const { data: contacts } = await dataProvider.getList<Contact>("contacts", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "first_seen", order: "DESC" },
  });

  return contacts.map((contact) => ({
    id: `contact.${contact.id}.created`,
    type: CONTACT_CREATED,
    company_id: contact.company_id,
    sales_id: contact.sales_id,
    contact,
    date: contact.first_seen,
  }));
}

async function getNewDeals(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const { data: deals } = await dataProvider.getList<Deal>("deals", {
    filter,
    pagination: { page: 1, perPage: 250 },
    sort: { field: "created_at", order: "DESC" },
  });

  return deals.map((deal) => ({
    id: `deal.${deal.id}.created`,
    type: DEAL_CREATED,
    company_id: deal.company_id,
    sales_id: deal.sales_id,
    deal,
    date: deal.created_at,
  }));
}

async function getTaskActivities(
  dataProvider: DataProvider,
  filter: any,
): Promise<Activity[]> {
  const tasksFilter = {} as any;
  if (filter.sales_id || filter["sales_id@in"]) {
    if (filter.sales_id) tasksFilter.sales_id = filter.sales_id;
    if (filter["sales_id@in"])
      tasksFilter["sales_id@in"] = filter["sales_id@in"];
  }

  const { data: tasks } = await dataProvider.getList<Task>("tasks", {
    filter: tasksFilter,
    pagination: { page: 1, perPage: 500 },
    sort: { field: "id", order: "DESC" },
  });

  const activities: Activity[] = [];
  for (const task of tasks) {
    if (task.done_date) {
      activities.push({
        id: `task.${task.id}.done`,
        type: TASK_DONE,
        sales_id: task.sales_id,
        task,
        date: task.done_date,
      });
    }
    const createdDate =
      task.created_at ?? task.due_date ?? task.done_date ?? undefined;
    if (createdDate) {
      activities.push({
        id: `task.${task.id}.created`,
        type: TASK_CREATED,
        sales_id: task.sales_id,
        task,
        date: createdDate,
      });
    }
  }
  return activities;
}
