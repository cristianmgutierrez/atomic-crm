import {
  email,
  required,
  useNotify,
  useRecordContext,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useEffect, useRef, useState } from "react";
import type { ClipboardEventHandler, FocusEvent } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { Loader2, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { SelectInput } from "@/components/admin/select-input";
import { ArrayInput } from "@/components/admin/array-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";

import { isLinkedinUrl } from "../misc/isLinkedInUrl";

const INSTAGRAM_HANDLE_REGEX = /^[a-zA-Z0-9_.]{1,30}$/;

const isInstagramHandle = (value: string) => {
  if (!value) return;
  const handle = value.startsWith("@") ? value.slice(1) : value;
  if (!INSTAGRAM_HANDLE_REGEX.test(handle)) {
    return {
      message: "crm.validation.invalid_instagram_handle",
      args: { _: "Invalid Instagram handle (e.g. @username or username)" },
    };
  }
};
import { StatusSelector } from "../notes";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Sale } from "../types";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import ImageEditorField from "../misc/ImageEditorField";
import {
  contactGender,
  translateContactGenderLabel,
  translatePersonalInfoTypeLabel,
} from "./contactModel.ts";
import { MaskedTextInput } from "./utils/MaskedTextInput";
import {
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskCurrency,
  maskDate,
  maskPhone,
} from "./utils/masks";
import {
  cepValidator,
  cnpjValidator,
  cpfValidator,
  dateValidator,
  phoneValidator,
  validatePhone,
} from "./utils/validations";
import { searchCEP } from "./utils/cep";

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const CROSS_SELL_OPTIONS = [
  "Banking",
  "Cartão de Crédito",
  "Previdência",
  "Seguro de Vida",
  "Plano de Saúde",
  "Consórcio",
  "Crédito/Financiamento",
  "Offshore",
  "Outro",
];

// Fields belonging to each tab — used to auto-switch tab on validation error
const TAB_FIELDS: Record<string, string[]> = {
  personal: [
    "first_name",
    "last_name",
    "alias",
    "phone_jsonb",
    "email_jsonb",
    "person_type",
    "document",
    "date_of_birth",
    "xp_code",
    "monthly_income",
    "gender",
    "linkedin_url",
    "website",
    "has_newsletter",
  ],
  investor: [
    "segment",
    "investor_profile",
    "declared_wealth",
    "xp_account_type",
    "xp_international",
    "investment_horizon",
    "financial_goal",
    "relationship_start_date",
    "xp_code_2",
    "mb_code",
    "avenue_code",
    "sales_id",
    "origin",
    "referred_by",
    "internal_notes",
  ],
};

const getTabForField = (fieldName: string): string => {
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    if (fields.includes(fieldName)) return tab;
  }
  return "address";
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const ContactInputs = () => {
  const translate = useTranslate();
  const [activeTab, setActiveTab] = useState("personal");
  const { errors, isSubmitted, submitCount } = useFormState();
  const prevSubmitCount = useRef(submitCount);

  useEffect(() => {
    if (submitCount === prevSubmitCount.current) return;
    prevSubmitCount.current = submitCount;
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    // Switch to the tab that contains the first error field
    const firstErrorKey = errorKeys[0];
    const targetTab = getTabForField(firstErrorKey);
    setActiveTab(targetTab);

    // After tab switch, scroll to and focus the first errored element
    setTimeout(() => {
      const el = document.querySelector(
        `[name="${firstErrorKey}"]`,
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 100);
  }, [submitCount, errors, isSubmitted]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="personal">
          {translate("resources.contacts.field_categories.personal_info", {
            _: "Informações Pessoais",
          })}
        </TabsTrigger>
        <TabsTrigger value="investor">
          {translate("resources.contacts.field_categories.investor_profile", {
            _: "Perfil do Investidor",
          })}
        </TabsTrigger>
        <TabsTrigger value="address">
          {translate("resources.contacts.field_categories.address", {
            _: "Endereço",
          })}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <Tab1PersonalInfo />
      </TabsContent>
      <TabsContent value="investor">
        <Tab2InvestorProfile />
      </TabsContent>
      <TabsContent value="address">
        <Tab3Address />
      </TabsContent>
    </Tabs>
  );
};

// ─── Tab 1: Informações Pessoais ─────────────────────────────────────────────

const Tab1PersonalInfo = () => {
  const translate = useTranslate();
  const { getValues, setValue } = useFormContext();
  const { noteStatuses } = useConfigurationContext();

  const personType = useWatch({ name: "person_type" });
  const status = useWatch({ name: "status" });
  const isProspect = status === "prospect";

  const statusChoices = noteStatuses.map((s) => ({
    id: s.value,
    name: s.label,
  }));

  const personalInfoTypes = [
    { id: "Work", name: translatePersonalInfoTypeLabel("Work", translate) },
    { id: "Home", name: translatePersonalInfoTypeLabel("Home", translate) },
    { id: "Other", name: translatePersonalInfoTypeLabel("Other", translate) },
  ];

  const handleEmailChange = (emailValue: string) => {
    const { first_name, last_name } = getValues();
    if (first_name || last_name || !emailValue) return;
    const [first, last] = emailValue.split("@")[0].split(".");
    setValue("first_name", first.charAt(0).toUpperCase() + first.slice(1));
    setValue(
      "last_name",
      last ? last.charAt(0).toUpperCase() + last.slice(1) : "",
    );
  };

  const handleEmailPaste: ClipboardEventHandler<
    HTMLTextAreaElement | HTMLInputElement
  > = (e) => {
    const emailVal = e.clipboardData?.getData("text/plain");
    handleEmailChange(emailVal);
  };

  const handleEmailBlur = (
    e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    handleEmailChange(e.target.value);
  };

  const handlePersonTypeChange = () => {
    setValue("document", "", { shouldDirty: true });
  };

  const documentMask = personType === "PJ" ? maskCNPJ : maskCPF;
  const documentValidator = personType === "PJ" ? cnpjValidator : cpfValidator;
  const documentLabel =
    personType === "PJ"
      ? translate("resources.contacts.fields.document", { _: "CNPJ" })
      : translate("resources.contacts.fields.document", { _: "CPF" });
  const documentPlaceholder =
    personType === "PJ" ? "XX.XXX.XXX/XXXX-XX" : "XXX.XXX.XXX-XX";

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Avatar + Status row */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <ImageEditorField
            source="avatar"
            type="avatar"
            width={72}
            height={72}
            emptyText="Foto"
            linkPosition="bottom"
          />
        </div>
        <div className="flex-1">
          <SelectInput
            source="status"
            label="resources.notes.fields.status"
            choices={statusChoices}
            helperText={false}
          />
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="first_name"
          validate={required()}
          helperText={false}
        />
        <TextInput
          source="last_name"
          validate={required()}
          helperText={false}
        />
      </div>

      {/* Alias */}
      <TextInput
        source="alias"
        label="resources.contacts.fields.alias"
        validate={!isProspect ? required() : undefined}
        helperText={false}
      />

      {/* Phone */}
      <div>
        <h6 className="text-sm font-medium mb-2">
          {translate("resources.contacts.fields.phone_jsonb", {
            _: "Telefones",
          })}
        </h6>
        <ArrayInput source="phone_jsonb" helperText={false}>
          <SimpleFormIterator
            inline
            disableReordering
            disableClear
            className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
          >
            <MaskedTextInput
              source="number"
              maskFn={maskPhone}
              className="w-full"
              helperText={false}
              label={false}
              placeholder="+55 11 98765-4321"
              validate={phoneValidator}
            />
            <SelectInput
              source="type"
              helperText={false}
              label={false}
              optionText="name"
              choices={personalInfoTypes}
              defaultValue="Work"
              className="w-24 min-w-24"
            />
          </SimpleFormIterator>
        </ArrayInput>
      </div>

      {/* Email */}
      <div>
        <h6 className="text-sm font-medium mb-2">
          {translate("resources.contacts.fields.email_jsonb", {
            _: "Emails",
          })}
        </h6>
        <ArrayInput source="email_jsonb" helperText={false}>
          <SimpleFormIterator
            inline
            disableReordering
            disableClear
            className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
          >
            <TextInput
              source="email"
              className="w-full"
              helperText={false}
              label={false}
              placeholder={translate("resources.contacts.fields.email")}
              validate={email()}
              onPaste={handleEmailPaste}
              onBlur={handleEmailBlur}
            />
            <SelectInput
              source="type"
              helperText={false}
              label={false}
              optionText="name"
              choices={personalInfoTypes}
              defaultValue="Work"
              className="w-24 min-w-24"
            />
          </SimpleFormIterator>
        </ArrayInput>
      </div>

      <ProspectContactAlert />

      {/* Tipo de Pessoa + Documento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          source="person_type"
          label="resources.contacts.fields.person_type"
          choices={[
            { id: "PF", name: "Pessoa Física (PF)" },
            { id: "PJ", name: "Pessoa Jurídica (PJ)" },
          ]}
          validate={!isProspect ? required() : undefined}
          helperText={false}
          onChange={handlePersonTypeChange}
        />
        <MaskedTextInput
          source="document"
          maskFn={documentMask}
          label={documentLabel}
          placeholder={documentPlaceholder}
          validate={!isProspect ? documentValidator : undefined}
          helperText={false}
        />
      </div>

      {/* Data de Nascimento (only PF) */}
      {personType !== "PJ" && (
        <MaskedTextInput
          source="date_of_birth"
          maskFn={maskDate}
          label="resources.contacts.fields.date_of_birth"
          placeholder="DD/MM/AAAA"
          validate={
            !isProspect && personType === "PF" ? dateValidator : undefined
          }
          helperText={false}
        />
      )}

      {/* Código XP + Renda Mensal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="xp_code"
          label="resources.contacts.fields.xp_code"
          helperText={false}
        />
        <MaskedTextInput
          source="monthly_income"
          maskFn={maskCurrency}
          label="resources.contacts.fields.monthly_income"
          placeholder="R$ 0,00"
          helperText={false}
        />
      </div>

      {/* Gênero */}
      <RadioButtonGroupInput
        label={false}
        row
        source="gender"
        choices={contactGender}
        helperText={false}
        optionText={(choice) => translateContactGenderLabel(choice, translate)}
        translateChoice={false}
        optionValue="value"
        defaultValue={contactGender[0].value}
      />

      {/* LinkedIn + Website */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="linkedin_url"
          label="resources.contacts.fields.linkedin_url"
          helperText={false}
          validate={isLinkedinUrl}
        />
        <TextInput
          source="website"
          label="resources.contacts.fields.website"
          helperText={false}
          validate={isInstagramHandle}
        />
      </div>

      {/* Newsletter */}
      <BooleanInput source="has_newsletter" helperText={false} />
    </div>
  );
};

// ─── Contact Validation Alert ────────────────────────────────────────────────

const ProspectContactAlert = () => {
  const status = useWatch({ name: "status" });
  const phoneJsonb = useWatch({ name: "phone_jsonb" });
  const emailJsonb = useWatch({ name: "email_jsonb" });

  if (!status) return null;

  const isProspect = status === "prospect";

  const hasValidPhone = phoneJsonb?.some(
    (p: { number?: string }) => p.number && validatePhone(p.number),
  );
  const hasValidEmail = emailJsonb?.some(
    (e: { email?: string }) => e.email && /\S+@\S+\.\S+/.test(e.email),
  );

  if (isProspect) {
    if (hasValidPhone || hasValidEmail) return null;
    return (
      <p className="text-sm text-destructive rounded bg-destructive/10 px-3 py-2">
        Para contatos com status <strong>Prospect</strong>, informe ao menos 1
        telefone válido ou 1 e-mail válido.
      </p>
    );
  }

  // Non-prospect statuses require BOTH phone AND email
  const missing: string[] = [];
  if (!hasValidPhone) missing.push("1 telefone válido");
  if (!hasValidEmail) missing.push("1 e-mail válido");

  if (missing.length === 0) return null;

  return (
    <p className="text-sm text-destructive rounded bg-destructive/10 px-3 py-2">
      Para este status, informe também: <strong>{missing.join(" e ")}</strong>.
    </p>
  );
};

// ─── Tab 2: Perfil do Investidor ──────────────────────────────────────────────

const Tab2InvestorProfile = () => {
  const translate = useTranslate();
  const { getValues, setValue } = useFormContext();
  const origin = useWatch({ name: "origin" });
  const crossSell: string[] =
    useWatch({ name: "cross_sell_opportunities" }) ?? [];

  const toggleCrossSell = (option: string) => {
    const current = getValues("cross_sell_opportunities") ?? [];
    const updated = current.includes(option)
      ? current.filter((v: string) => v !== option)
      : [...current, option];
    setValue("cross_sell_opportunities", updated, { shouldDirty: true });
  };

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Segmento + Perfil Investidor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          source="segment"
          label="resources.contacts.fields.segment"
          choices={[
            { id: "Digital", name: "Digital" },
            { id: "Exclusive", name: "Exclusive" },
            { id: "Signature", name: "Signature" },
            { id: "Unique", name: "Unique" },
            { id: "Private", name: "Private" },
          ]}
          helperText={false}
        />
        <SelectInput
          source="investor_profile"
          label="resources.contacts.fields.investor_profile"
          choices={[
            { id: "Regular", name: "Regular" },
            { id: "Qualificado", name: "Qualificado" },
            { id: "Profissional", name: "Profissional" },
          ]}
          helperText={false}
        />
      </div>

      {/* Patrimônio + Tipo Conta XP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MaskedTextInput
          source="declared_wealth"
          maskFn={maskCurrency}
          label="resources.contacts.fields.declared_wealth"
          placeholder="R$ 0,00"
          helperText={false}
        />
        <SelectInput
          source="xp_account_type"
          label="resources.contacts.fields.xp_account_type"
          choices={[
            { id: "Assessorado", name: "Assessorado" },
            { id: "Autônomo", name: "Autônomo" },
            { id: "Institucional", name: "Institucional" },
          ]}
          helperText={false}
        />
      </div>

      {/* XP Internacional + Horizonte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          source="xp_international"
          label="resources.contacts.fields.xp_international"
          choices={[
            { id: "true", name: "Sim" },
            { id: "false", name: "Não" },
          ]}
          helperText={false}
        />
        <SelectInput
          source="investment_horizon"
          label="resources.contacts.fields.investment_horizon"
          choices={[
            { id: "Curto Prazo", name: "Curto Prazo" },
            { id: "Médio Prazo", name: "Médio Prazo" },
            { id: "Longo Prazo", name: "Longo Prazo" },
          ]}
          helperText={false}
        />
      </div>

      {/* Objetivo Financeiro + Início Relacionamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          source="financial_goal"
          label="resources.contacts.fields.financial_goal"
          choices={[
            { id: "Aposentadoria", name: "Aposentadoria" },
            { id: "Preservação de Capital", name: "Preservação de Capital" },
            { id: "Crescimento", name: "Crescimento" },
            { id: "Renda Passiva", name: "Renda Passiva" },
            { id: "Outro", name: "Outro" },
          ]}
          helperText={false}
        />
        <MaskedTextInput
          source="relationship_start_date"
          maskFn={maskDate}
          label="resources.contacts.fields.relationship_start_date"
          placeholder="DD/MM/AAAA"
          validate={dateValidator}
          helperText={false}
        />
      </div>

      {/* Códigos XP2 / MB / Avenue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextInput
          source="xp_code_2"
          label="resources.contacts.fields.xp_code_2"
          helperText={false}
        />
        <TextInput
          source="mb_code"
          label="resources.contacts.fields.mb_code"
          helperText={false}
        />
        <TextInput
          source="avenue_code"
          label="resources.contacts.fields.avenue_code"
          helperText={false}
        />
      </div>

      {/* Assessor Responsável */}
      <ReferenceInput
        reference="sales"
        source="sales_id"
        sort={{ field: "last_name", order: "ASC" }}
        filter={{ "disabled@neq": true }}
      >
        <SelectInput
          helperText={false}
          label="resources.contacts.fields.sales_id"
          optionText={saleOptionRenderer}
          validate={required()}
        />
      </ReferenceInput>

      {/* Origem + Quem Indicou */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          source="origin"
          label="resources.contacts.fields.origin"
          choices={[
            { id: "Indicação", name: "Indicação" },
            { id: "Prospecção", name: "Prospecção" },
            { id: "Campanha", name: "Campanha" },
            { id: "Evento", name: "Evento" },
            { id: "Outro", name: "Outro" },
          ]}
          helperText={false}
        />
        <TextInput
          source="referred_by"
          label="resources.contacts.fields.referred_by"
          validate={origin === "Indicação" ? required() : undefined}
          helperText={false}
        />
      </div>

      {/* Cross Sell Opportunities */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h6 className="text-sm font-semibold mb-3">
          {translate("resources.contacts.fields.cross_sell_opportunities", {
            _: "Oportunidades Cross Sell",
          })}
        </h6>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CROSS_SELL_OPTIONS.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={`cross-sell-${option}`}
                checked={crossSell.includes(option)}
                onCheckedChange={() => toggleCrossSell(option)}
              />
              <Label
                htmlFor={`cross-sell-${option}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Observações Internas */}
      <TextInput
        source="internal_notes"
        label="resources.contacts.fields.internal_notes"
        multiline
        rows={4}
        helperText={false}
      />
    </div>
  );
};

// ─── Tab 3: Endereço ──────────────────────────────────────────────────────────

const Tab3Address = () => {
  const translate = useTranslate();
  const { setValue } = useFormContext();
  const [cepLoading, setCepLoading] = useState(false);
  const notify = useNotify();
  const zipCode = useWatch({ name: "zip_code" }) ?? "";

  const handleCEPSearch = async () => {
    const cep = zipCode;
    if (!cep) return;
    setCepLoading(true);
    try {
      const result = await searchCEP(cep);
      setValue("address", result.address, { shouldDirty: true });
      setValue("neighborhood", result.neighborhood, { shouldDirty: true });
      setValue("city", result.city, { shouldDirty: true });
      setValue("state", result.state, { shouldDirty: true });
      notify("Endereço preenchido automaticamente.", { type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar o CEP.";
      notify(msg, { type: "error" });
    } finally {
      setCepLoading(false);
    }
  };

  const stateChoices = BRAZIL_STATES.map((uf) => ({ id: uf, name: uf }));

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* CEP com botão busca */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <MaskedTextInput
            source="zip_code"
            maskFn={maskCEP}
            label="resources.contacts.fields.zip_code"
            placeholder="XXXXX-XXX"
            validate={cepValidator}
            helperText={false}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleCEPSearch}
          disabled={cepLoading || !zipCode}
          className="mb-0.5"
        >
          {cepLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {translate("ra.action.search", { _: "Buscar" })}
        </Button>
      </div>

      {/* Logradouro + Número */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <TextInput
            source="address"
            label="resources.contacts.fields.address"
            helperText={false}
          />
        </div>
        <TextInput
          source="address_number"
          label="resources.contacts.fields.address_number"
          placeholder="Nº"
          helperText={false}
        />
      </div>

      {/* Complemento + Bairro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="address_complement"
          label="resources.contacts.fields.address_complement"
          placeholder="Apto, Sala, etc"
          helperText={false}
        />
        <TextInput
          source="neighborhood"
          label="resources.contacts.fields.neighborhood"
          helperText={false}
        />
      </div>

      {/* Cidade + Estado + País */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextInput
          source="city"
          label="resources.contacts.fields.city"
          helperText={false}
        />
        <SelectInput
          source="state"
          label="resources.contacts.fields.state"
          choices={stateChoices}
          helperText={false}
        />
        <TextInput
          source="country"
          label="resources.contacts.fields.country"
          helperText={false}
          defaultValue="Brasil"
        />
      </div>

      {/* Empresa + Cargo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReferenceInput source="company_id" reference="companies" perPage={10}>
          <AutocompleteCompanyInput label="resources.contacts.fields.company_id" />
        </ReferenceInput>
        <TextInput
          source="title"
          label="resources.contacts.fields.title"
          helperText={false}
        />
      </div>

      {/* Observações Endereço */}
      <TextInput
        source="address_notes"
        label="resources.contacts.fields.address_notes"
        multiline
        rows={3}
        helperText={false}
      />

      {/* Background (bio) */}
      <TextInput
        source="background"
        label="resources.contacts.fields.background"
        multiline
        rows={3}
        helperText={false}
      />
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;

// ─── Status Selector (standalone — usado no Aside e Show) ─────────────────────

export const ContactStatusSelector = () => {
  const record = useRecordContext<Contact>();
  const [update] = useUpdate<Contact>();
  const notify = useNotify();
  if (!record) return null;

  const handleStatusChange = (nextStatus: string) => {
    if (nextStatus === record?.status) return;

    update(
      "contacts",
      {
        id: record.id,
        data: { status: nextStatus },
        previousData: record,
      },
      {
        mutationMode: "optimistic",
        onError: (error) => {
          notify(
            typeof error === "string"
              ? error
              : error?.message || "ra.notification.http_error",
            {
              type: "error",
              messageArgs: {
                _: typeof error === "string" ? error : error?.message,
              },
            },
          );
        },
      },
    );
  };

  return (
    <div className="[&_button]:w-auto">
      <StatusSelector
        status={record?.status}
        setStatus={handleStatusChange}
        triggerClassName="w-full"
      />
    </div>
  );
};
