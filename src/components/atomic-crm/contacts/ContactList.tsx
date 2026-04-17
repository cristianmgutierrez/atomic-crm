import jsonExport from "jsonexport/dist";
import {
  downloadCSV,
  InfiniteListBase,
  useGetIdentity,
  useListContext,
  type Exporter,
} from "ra-core";
import { BulkActionsToolbar } from "@/components/admin/bulk-actions-toolbar";
import { BulkDeleteButton } from "@/components/admin/bulk-delete-button";
import { BulkExportButton } from "@/components/admin/bulk-export-button";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SelectAllButton } from "@/components/admin/select-all-button";

import type { Company, Contact, Sale, Tag } from "../types";
import { BulkTagButton } from "./BulkTagButton";
import { ContactEmpty } from "./ContactEmpty";
import { ContactImportButton } from "./ContactImportButton";
import {
  ContactListFilterSummary,
  ContactListFilter,
} from "./ContactListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { InfinitePagination } from "../misc/InfinitePagination";
import MobileHeader from "../layout/MobileHeader";
import { MobileContent } from "../layout/MobileContent";
import { ContactListContentMobile } from "./ContactListContent";
import { EditableCell } from "./EditableCell";
import {
  isoToDisplay,
  displayToIso,
  toMaskedCurrency,
  parseCurrencyField,
} from "./contactModel";
import {
  maskPhone,
  maskCPF,
  maskCNPJ,
  maskDate,
  maskCurrency,
} from "./utils/masks";
import {
  BRAZIL_STATE_CHOICES,
  flattenEmailJsonb,
  flattenPhoneJsonb,
  formatCurrencyBRL,
  INVESTOR_PROFILE_CHOICES,
  SEGMENT_CHOICES,
  XP_ACCOUNT_TYPE_CHOICES,
} from "./contactFieldConfig";
import {
  checkDocumentUnique,
  validateCNPJ,
  validateCPF,
  validateDate,
  validateEmail,
  validatePhone,
} from "./utils/validations";

// ─── Sticky column classes ────────────────────────────────────────────────────

const STICKY_FIRST_NAME_HEADER =
  "sticky left-8 z-20 bg-background after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border";
const STICKY_FIRST_NAME_CELL =
  "sticky left-8 z-10 bg-background after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border";

// ─── Main components ──────────────────────────────────────────────────────────

export const ContactList = () => {
  const { identity } = useGetIdentity();

  if (!identity) return null;

  // Stopgap until RLS multi-tenant is enforced on the backend (CLAUDE.md roadmap item 3)
  const permanentFilter =
    identity.papel === "assessor" ? { sales_id: identity.id } : undefined;

  return (
    <List
      title={false}
      actions={<ContactListActions />}
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
      filter={permanentFilter}
    >
      <ContactListLayoutDesktop />
    </List>
  );
};

const ContactListLayoutDesktop = () => {
  const { data, isPending, filterValues } = useListContext();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;

  if (!data?.length && !hasFilters) return <ContactEmpty />;

  return (
    <div className="flex flex-row gap-4">
      <ContactListFilter />
      <div className="min-w-0 flex-1 flex flex-col gap-4">
        <div className="overflow-x-auto rounded-md border">
          <DataTable
            rowClick="show"
            bulkActionButtons={<ContactBulkActionButtons />}
            bulkActionsToolbar={false}
            className="border-0 rounded-none"
          >
            {/* Coluna Nome: sticky após o checkbox (w-8 = 32px = left-8) */}
            <DataTable.Col
              source="first_name"
              headerClassName={STICKY_FIRST_NAME_HEADER}
              cellClassName={STICKY_FIRST_NAME_CELL}
              render={(r: Contact) => (
                <EditableCell
                  source="first_name"
                  config={{ inputType: "text" }}
                >
                  {r.first_name}
                </EditableCell>
              )}
            />

            {/* Sobrenome: scrollável */}
            <DataTable.Col
              source="last_name"
              render={(r: Contact) => (
                <EditableCell source="last_name" config={{ inputType: "text" }}>
                  {r.last_name}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="alias"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="alias"
                  config={{ inputType: "text" }}
                  copyValue={r.alias}
                >
                  {r.alias}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="phone_jsonb"
              label="Telefone"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="phone_jsonb"
                  config={{
                    inputType: "text",
                    maskFn: maskPhone,
                    toInput: () => r.phone_jsonb?.[0]?.number ?? "",
                    getSaveData: (_record, val) => ({
                      phone_jsonb:
                        r.phone_jsonb?.length > 0
                          ? [
                              { ...r.phone_jsonb[0], number: val },
                              ...r.phone_jsonb.slice(1),
                            ]
                          : [{ number: val, type: "Work" }],
                    }),
                    validate: (val) => {
                      if (!val) return undefined;
                      return validatePhone(val)
                        ? undefined
                        : "crm.validation.invalid_phone";
                    },
                  }}
                  copyValue={r.phone_jsonb?.[0]?.number}
                >
                  {r.phone_jsonb?.[0]?.number}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="email_jsonb"
              label="E-mail"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="email_jsonb"
                  config={{
                    inputType: "text",
                    toInput: () => r.email_jsonb?.[0]?.email ?? "",
                    getSaveData: (_record, val) => ({
                      email_jsonb:
                        r.email_jsonb?.length > 0
                          ? [
                              { ...r.email_jsonb[0], email: val },
                              ...r.email_jsonb.slice(1),
                            ]
                          : [{ email: val, type: "Work" }],
                    }),
                    validate: (val) => {
                      if (!val) return undefined;
                      return validateEmail(val)
                        ? undefined
                        : "crm.validation.invalid_email";
                    },
                  }}
                  copyValue={r.email_jsonb?.[0]?.email}
                >
                  {r.email_jsonb?.[0]?.email}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="document"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="document"
                  config={{
                    inputType: "text",
                    maskFn: r.person_type === "PJ" ? maskCNPJ : maskCPF,
                    validate: async (val, record) => {
                      if (!val) return undefined;
                      const isPJ = record.person_type === "PJ";
                      const isValid = isPJ
                        ? validateCNPJ(val)
                        : validateCPF(val);
                      if (!isValid)
                        return isPJ
                          ? "crm.validation.invalid_cnpj"
                          : "crm.validation.invalid_cpf";
                      const isUnique = await checkDocumentUnique(
                        val,
                        record.id,
                      );
                      if (!isUnique)
                        return "crm.validation.document_already_registered";
                      return undefined;
                    },
                  }}
                  copyValue={r.document}
                >
                  {r.document}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="xp_code"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="xp_code"
                  config={{ inputType: "text" }}
                  copyValue={r.xp_code}
                >
                  {r.xp_code}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="date_of_birth"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="date_of_birth"
                  config={{
                    inputType: "text",
                    maskFn: maskDate,
                    toInput: (v) => isoToDisplay(v as string) ?? "",
                    toSave: (v) => displayToIso(v) ?? null,
                    validate: (val) => {
                      if (!val) return undefined;
                      return validateDate(val)
                        ? undefined
                        : "crm.validation.invalid_date";
                    },
                  }}
                >
                  {isoToDisplay(r.date_of_birth)}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="segment"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="segment"
                  config={{
                    inputType: "select",
                    choices: SEGMENT_CHOICES,
                  }}
                >
                  {r.segment}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="investor_profile"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="investor_profile"
                  config={{
                    inputType: "select",
                    choices: INVESTOR_PROFILE_CHOICES,
                  }}
                >
                  {r.investor_profile}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="declared_wealth"
              disableSort
              headerClassName="text-right"
              cellClassName="text-right"
              render={(r: Contact) => (
                <EditableCell
                  source="declared_wealth"
                  config={{
                    inputType: "text",
                    maskFn: maskCurrency,
                    toInput: (v) => toMaskedCurrency(v as number | null),
                    toSave: (v) => parseCurrencyField(v),
                  }}
                >
                  {formatCurrencyBRL(r.declared_wealth)}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="xp_account_type"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="xp_account_type"
                  config={{
                    inputType: "select",
                    choices: XP_ACCOUNT_TYPE_CHOICES,
                  }}
                >
                  {r.xp_account_type}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="city"
              disableSort
              render={(r: Contact) => (
                <EditableCell source="city" config={{ inputType: "text" }}>
                  {r.city}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="state"
              disableSort
              render={(r: Contact) => (
                <EditableCell
                  source="state"
                  config={{
                    inputType: "select",
                    choices: BRAZIL_STATE_CHOICES,
                  }}
                >
                  {r.state}
                </EditableCell>
              )}
            />

            <DataTable.Col
              source="country"
              disableSort
              render={(r: Contact) => (
                <EditableCell source="country" config={{ inputType: "text" }}>
                  {r.country}
                </EditableCell>
              )}
            />
          </DataTable>
        </div>
        <BulkActionsToolbar>
          <ContactBulkActionButtons />
        </BulkActionsToolbar>
      </div>
    </div>
  );
};

const ContactBulkActionButtons = () => (
  <>
    <SelectAllButton />
    <BulkTagButton />
    <BulkExportButton />
    <BulkDeleteButton />
  </>
);

const ContactListActions = () => (
  <TopToolbar>
    <ContactImportButton />
    <ExportButton exporter={exporter} />
    <CreateButton />
  </TopToolbar>
);

export const ContactListMobile = () => {
  const { identity } = useGetIdentity();
  if (!identity) return null;

  return (
    <InfiniteListBase
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
      queryOptions={{
        onError: () => {
          /* Disable error notification as ContactListLayoutMobile handles it */
        },
      }}
    >
      <ContactListLayoutMobile />
    </InfiniteListBase>
  );
};

const ContactListLayoutMobile = () => {
  const { isPending, data, error, filterValues } = useListContext();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (!isPending && !data?.length && !hasFilters) return <ContactEmpty />;

  return (
    <div>
      <MobileHeader>
        <ContactListFilter />
      </MobileHeader>
      <MobileContent>
        <ContactListFilterSummary />
        <ContactListContentMobile />
        {!error && (
          <div className="flex justify-center">
            <InfinitePagination />
          </div>
        )}
      </MobileContent>
    </div>
  );
};

const exporter: Exporter<Contact> = async (records, fetchRelatedRecords) => {
  const companies = await fetchRelatedRecords<Company>(
    records,
    "company_id",
    "companies",
  );
  const sales = await fetchRelatedRecords<Sale>(records, "sales_id", "sales");
  const tags = await fetchRelatedRecords<Tag>(records, "tags", "tags");

  const contacts = records.map((contact) => {
    const exportedContact = {
      ...contact,
      company:
        contact.company_id != null
          ? companies[contact.company_id].name
          : undefined,
      sales: `${sales[contact.sales_id].first_name} ${
        sales[contact.sales_id].last_name
      }`,
      tags: contact.tags.map((tagId) => tags[tagId].name).join(", "),
      ...flattenEmailJsonb(contact.email_jsonb),
      email_jsonb: JSON.stringify(contact.email_jsonb),
      email_fts: undefined,
      ...flattenPhoneJsonb(contact.phone_jsonb),
      phone_jsonb: JSON.stringify(contact.phone_jsonb),
      phone_fts: undefined,
    };
    delete exportedContact.email_fts;
    delete exportedContact.phone_fts;
    return exportedContact;
  });
  return jsonExport(contacts, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "contacts");
  });
};
