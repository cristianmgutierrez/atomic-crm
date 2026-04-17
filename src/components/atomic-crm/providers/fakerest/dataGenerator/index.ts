import { generateCompanies } from "./companies";
import { generateContacts } from "./contacts";
import { generateDeals } from "./deals";
import { generatePipelines } from "./pipelines";
import { generateSales } from "./sales";
import { generateTags } from "./tags";
import { generateTasks } from "./tasks";
import type { Db } from "./types";

export default (): Db => {
  const db = {} as Db;
  db.sales = generateSales(db);
  db.tags = generateTags(db);
  db.companies = generateCompanies(db);
  db.contacts = generateContacts(db);
  db.pipelines = generatePipelines(db);
  db.deals = generateDeals(db);
  db.tasks = generateTasks(db);
  db.configuration = [
    {
      id: 1,
      config: {} as Db["configuration"][number]["config"],
    },
  ];

  return db;
};
