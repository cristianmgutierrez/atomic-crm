import type { Pipeline } from "../../../types";
import type { Db } from "./types";

export const generatePipelines = (_db: Db): Pipeline[] => [
  {
    id: 1,
    name: "Funil de Vendas",
    stages: [
      { value: "opportunity", label: "Oportunidade" },
      { value: "proposal-sent", label: "Proposta Enviada" },
      { value: "in-negociation", label: "Em Negociação" },
      { value: "won", label: "Conta Ativada" },
      { value: "lost", label: "Perdido" },
      { value: "delayed", label: "Em Atraso" },
    ],
    pipeline_statuses: ["lost"],
    position: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Funil de Onboarding",
    stages: [
      { value: "captacao", label: "Captação" },
      { value: "documentacao", label: "Documentação" },
      { value: "abertura", label: "Abertura de Conta" },
      { value: "ativado", label: "Ativado" },
    ],
    pipeline_statuses: [],
    position: 1,
    created_at: new Date().toISOString(),
  },
];
