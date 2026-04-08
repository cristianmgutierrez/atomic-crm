import { Draggable } from "@hello-pangea/dnd";
import { useRedirect, RecordContextProvider, useGetOne } from "ra-core";
import { NumberField } from "@/components/admin/number-field";
import { SelectField } from "@/components/admin/select-field";
import { DateField } from "@/components/admin/date-field";
import { Card, CardContent } from "@/components/ui/card";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";

export const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  if (!deal) return null;

  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(provided, snapshot) => (
        <DealCardContent provided={provided} snapshot={snapshot} deal={deal} />
      )}
    </Draggable>
  );
};

const FirstContact = ({ contactIds }: { contactIds?: number[] }) => {
  const firstId = contactIds?.[0];

  if (!firstId) {
    return null;
  }

  const { data: contact } = useGetOne("contacts_summary", { id: firstId });

  if (!contact) {
    return null;
  }

  const contactName = `${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`;
  const segment = contact.segment || "—";

  return (
    <p className="text-xs text-muted-foreground mb-2">
      {contactName} - {segment}
    </p>
  );
};

export const DealCardContent = ({
  provided,
  snapshot,
  deal,
}: {
  provided?: any;
  snapshot?: any;
  deal: Deal;
}) => {
  const { dealCategories, currency } = useConfigurationContext();
  const redirect = useRedirect();
  const handleClick = () => {
    redirect(`/deals/${deal.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <RecordContextProvider value={deal}>
        <Card
          className={`py-3 transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 transform rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md"
          }`}
        >
          <CardContent className="px-3 flex flex-col">
            {/* Line 1: Deal name (main title) */}
            <p className="text-sm font-semibold mb-2">{deal.name}</p>

            {/* Line 2: Contact - Company */}
            <FirstContact
              contactIds={deal.contact_ids as number[] | undefined}
            />

            {/* Line 3: Last activity date */}
            <p className="text-xs text-muted-foreground mb-2">
              Última atividade:{" "}
              <DateField source="updated_at" showTime={false} />
            </p>

            {/* Line 4: Category - Value */}
            <p className="text-xs text-muted-foreground">
              <SelectField
                source="category"
                choices={dealCategories}
                optionText="label"
                optionValue="value"
              />
              {deal.category && " - "}
              <NumberField
                source="amount"
                options={{
                  notation: "compact",
                  style: "currency",
                  currency,
                  currencyDisplay: "narrowSymbol",
                  minimumSignificantDigits: 3,
                }}
              />
            </p>
          </CardContent>
        </Card>
      </RecordContextProvider>
    </div>
  );
};
