import { useMutation } from "@tanstack/react-query";
import {
  required,
  useDataProvider,
  useEditController,
  useNotify,
  useRecordContext,
  useRedirect,
} from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { CancelButton } from "@/components/admin/cancel-button";
import { SaveButton } from "@/components/admin/form";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";
import { Card, CardContent } from "@/components/ui/card";

import type { Escritorio } from "../types";

type EscritorioFormData = { name: string };

function EditToolbar() {
  return (
    <div className="flex justify-end gap-4">
      <CancelButton />
      <SaveButton />
    </div>
  );
}

const EscritorioEditTitle = () => {
  const record = useRecordContext<Escritorio>();
  if (!record) return null;
  return <h2 className="text-lg font-semibold mb-4">Editar: {record.name}</h2>;
};

export function EscritoriosEdit() {
  const { record } = useEditController();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const { mutate } = useMutation({
    mutationFn: async (data: EscritorioFormData) => {
      if (!record) throw new Error("Registro não encontrado");
      return dataProvider.update("escritorios", {
        id: record.id,
        data,
        previousData: record,
      });
    },
    onSuccess: () => {
      redirect("/escritorios");
      notify("Escritório atualizado com sucesso.");
    },
    onError: () => {
      notify("Erro ao atualizar escritório.", { type: "error" });
    },
  });

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardContent>
          <SimpleForm
            toolbar={<EditToolbar />}
            onSubmit={mutate as SubmitHandler<any>}
            record={record}
          >
            <EscritorioEditTitle />
            <TextInput
              source="name"
              label="Nome"
              validate={required()}
              helperText={false}
            />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}
