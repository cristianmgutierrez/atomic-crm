import { Form, useGetIdentity, useRedirect } from "ra-core";
import { Create } from "@/components/admin/create";
import { SaveButton } from "@/components/admin/form";
import { FormToolbar } from "@/components/admin/simple-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { useSelectedPipeline } from "../pipelines/useSelectedPipeline";
import type { Deal } from "../types";
import { DealInputs } from "./DealInputs";

export const DealCreate = ({
  open,
  initialValues,
  onClose,
  onSuccess: onSuccessProp,
}: {
  open: boolean;
  initialValues?: Partial<Deal>;
  onClose?: () => void;
  onSuccess?: (deal: Deal) => void | Promise<void>;
}) => {
  const redirect = useRedirect();
  const { identity } = useGetIdentity();
  const { selectedPipeline } = useSelectedPipeline();

  const handleClose = () => (onClose ? onClose() : redirect("/deals"));

  const handleSuccess = async (deal: Deal) => {
    if (onSuccessProp) await onSuccessProp(deal);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        <Create resource="deals" mutationOptions={{ onSuccess: handleSuccess }}>
          <Form
            defaultValues={{
              sales_id: identity?.id,
              contact_ids: [],
              index: 0,
              pipeline_id: selectedPipeline?.id,
              stage: selectedPipeline?.stages?.[0]?.value,
              ...initialValues,
            }}
          >
            <DealInputs />
            <FormToolbar>
              <SaveButton />
            </FormToolbar>
          </Form>
        </Create>
      </DialogContent>
    </Dialog>
  );
};
