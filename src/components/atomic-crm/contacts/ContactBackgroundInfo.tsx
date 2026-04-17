import {
  useGetIdentity,
  useLocaleState,
  useRecordContext,
  useTranslate,
  WithRecord,
} from "ra-core";
import { TextField } from "@/components/admin/text-field";
import { formatLocalizedDate } from "../misc/RelativeDate";
import { useGetSalesName } from "../sales/useGetSalesName";
import type { Contact } from "../types";
import { MapPin, TrendingUp } from "lucide-react";
import { formatCurrencyBRL } from "./contactFieldConfig";

export const ContactBackgroundInfo = () => {
  const record = useRecordContext<Contact>();
  const translate = useTranslate();
  const [locale = "en"] = useLocaleState();
  const { identity } = useGetIdentity();
  const isCurrentUser = record?.sales_id === identity?.id;
  const salesName = useGetSalesName(record?.sales_id, {
    enabled: !isCurrentUser,
  });

  if (!record) return null;

  const formattedLastSeen = record.last_seen
    ? formatLocalizedDate(record.last_seen, locale)
    : "";
  const formattedFirstSeen = formatLocalizedDate(record.first_seen, locale);

  const hasInvestorInfo =
    record.segment ||
    record.investor_profile ||
    record.investment_horizon ||
    record.financial_goal ||
    record.xp_account_type;

  const hasAddress =
    record.zip_code || record.address || record.city || record.state;

  return (
    <div>
      <WithRecord<Contact>
        render={(record) =>
          record?.background ? (
            <div className="pb-2 text-sm">
              <TextField source="background" record={record} />
            </div>
          ) : null
        }
      />

      {/* Perfil do Investidor */}
      {hasInvestorInfo && (
        <div className="mt-1">
          <div className="flex items-center gap-1 mb-1 text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {translate(
                "resources.contacts.field_categories.investor_profile",
                { _: "Perfil do Investidor" },
              )}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {record.segment && <span>Segmento: {record.segment}</span>}
            {record.investor_profile && (
              <span>Perfil: {record.investor_profile}</span>
            )}
            {record.xp_account_type && (
              <span>Conta XP: {record.xp_account_type}</span>
            )}
            {record.investment_horizon && (
              <span>Horizonte: {record.investment_horizon}</span>
            )}
            {record.financial_goal && (
              <span>Objetivo: {record.financial_goal}</span>
            )}
            {record.declared_wealth != null && (
              <span>
                Patrimônio: {formatCurrencyBRL(record.declared_wealth)}
              </span>
            )}
            {record.relationship_start_date && (
              <span>
                Relacionamento desde:{" "}
                {formatLocalizedDate(record.relationship_start_date, locale)}
              </span>
            )}
            {record.origin && <span>Origem: {record.origin}</span>}
          </div>
        </div>
      )}

      {/* Cross Sell */}
      {record.cross_sell_opportunities &&
        record.cross_sell_opportunities.length > 0 && (
          <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
            <span className="font-medium">Cross Sell: </span>
            {record.cross_sell_opportunities.join(", ")}
          </div>
        )}

      {/* Adicionado em / Última atividade / Seguido por */}
      <div className="mt-2 pt-2 border-t">
        <div className="text-muted-foreground md:py-0.5">
          <span className="text-sm">
            {translate("resources.contacts.background.added_on", {
              date: formattedFirstSeen,
            })}
          </span>{" "}
        </div>

        <div className="text-muted-foreground md:py-0.5">
          <span className="text-sm">
            {translate("resources.contacts.background.last_activity_on", {
              date: formattedLastSeen,
            })}
          </span>
        </div>

        <div className="inline-flex text-muted-foreground text-sm md:py-0.5">
          {translate(
            isCurrentUser
              ? "resources.contacts.background.followed_by_you"
              : "resources.contacts.background.followed_by",
            { name: salesName },
          )}
        </div>
      </div>

      {/* Endereço */}
      {hasAddress && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 mb-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {translate("resources.contacts.field_categories.address", {
                _: "Endereço",
              })}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {[record.address, record.address_number, record.address_complement]
              .filter(Boolean)
              .join(", ")}
            {(record.address || record.address_number) &&
              (record.neighborhood || record.city) &&
              " — "}
            {[record.neighborhood, record.city, record.state]
              .filter(Boolean)
              .join(", ")}
            {record.zip_code && ` (${record.zip_code})`}
          </div>
        </div>
      )}

      {/* Internal Notes */}
      {record.internal_notes && (
        <div className="mt-2 pt-2 border-t text-sm text-muted-foreground italic">
          {record.internal_notes}
        </div>
      )}
    </div>
  );
};
