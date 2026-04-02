import type { Escritorio } from "../types";
import { EscritoriosCreate } from "./EscritoriosCreate";
import { EscritoriosEdit } from "./EscritoriosEdit";
import { EscritoriosList } from "./EscritoriosList";

export default {
  list: EscritoriosList,
  create: EscritoriosCreate,
  edit: EscritoriosEdit,
  recordRepresentation: (record: Escritorio) => record.name,
};
