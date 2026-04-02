import { useMutation } from "@tanstack/react-query";
import { required, useDataProvider, useNotify, useRedirect } from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/admin/simple-form";
import { TextInput } from "@/components/admin/text-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EscritorioFormData = { name: string };

export function EscritoriosCreate() {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const { mutate } = useMutation({
    mutationFn: async (data: EscritorioFormData) =>
      dataProvider.create("escritorios", { data }),
    onSuccess: () => {
      notify("Escritório criado com sucesso.");
      redirect("/escritorios");
    },
    onError: () => {
      notify("Erro ao criar escritório.", { type: "error" });
    },
  });

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Novo Escritório</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleForm onSubmit={mutate as SubmitHandler<any>}>
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
