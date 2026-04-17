import { useState } from "react";
import {
  useLocaleState,
  useRecordContext,
  useTranslate,
  WithRecord,
} from "ra-core";
import { formatLocalizedDate } from "../misc/RelativeDate";
import { ArrayField } from "@/components/admin/array-field";
import { SingleFieldList } from "@/components/admin/single-field-list";
import { TextField } from "@/components/admin/text-field";
import { EmailField } from "@/components/admin/email-field";
import {
  Building,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  contactGender,
  translateContactGenderLabel,
  translatePersonalInfoTypeLabel,
} from "./contactModel";
import type { Contact } from "../types";

export const ContactPersonalInfo = () => {
  const record = useRecordContext<Contact>();
  const translate = useTranslate();
  const [locale = "en"] = useLocaleState();

  if (!record) return null;

  return (
    <div>
      {/* Emails */}
      <ArrayField source="email_jsonb">
        <SingleFieldList className="flex-col gap-y-0">
          <EmailRow />
        </SingleFieldList>
      </ArrayField>

      {record.has_newsletter && (
        <p className="pl-6 py-1 text-sm text-muted-foreground">
          {translate("resources.contacts.fields.has_newsletter")}
        </p>
      )}

      {/* LinkedIn */}
      {record.linkedin_url && (
        <PersonalInfoRow
          icon={<Linkedin className="w-4 h-4 text-muted-foreground" />}
          primary={
            <a
              className="underline hover:no-underline text-sm text-muted-foreground"
              href={record.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              title={record.linkedin_url}
            >
              LinkedIn
            </a>
          }
        />
      )}

      {/* Instagram */}
      {record.website && (
        <PersonalInfoRow
          icon={<Instagram className="w-4 h-4 text-muted-foreground" />}
          primary={
            <a
              className="underline hover:no-underline text-sm text-muted-foreground"
              href={`https://www.instagram.com/${record.website.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {record.website.startsWith("@")
                ? record.website
                : `@${record.website}`}
            </a>
          }
        />
      )}

      {/* Phones */}
      <ArrayField source="phone_jsonb">
        <SingleFieldList className="flex-col gap-y-0">
          <PhoneRow />
        </SingleFieldList>
      </ArrayField>

      {/* Gender */}
      {contactGender
        .map((genderOption) => {
          if (record.gender === genderOption.value) {
            return (
              <PersonalInfoRow
                key={genderOption.value}
                icon={
                  <genderOption.icon className="w-4 h-4 text-muted-foreground" />
                }
                primary={
                  <div>
                    {translateContactGenderLabel(genderOption, translate)}
                  </div>
                }
              />
            );
          }
          return null;
        })
        .filter(Boolean)}

      {/* Alias */}
      {record.alias && (
        <PersonalInfoRow
          icon={<User className="w-4 h-4 text-muted-foreground" />}
          primary={
            <span className="text-sm text-muted-foreground">
              {translate("resources.contacts.fields.alias", { _: "Apelido" })}:{" "}
              {record.alias}
            </span>
          }
        />
      )}

      {/* Document */}
      {record.document && (
        <PersonalInfoRow
          icon={<CreditCard className="w-4 h-4 text-muted-foreground" />}
          primary={
            <span className="text-sm text-muted-foreground">
              {record.person_type === "PJ" ? "CNPJ" : "CPF"}: {record.document}
            </span>
          }
          copyValue={record.document}
        />
      )}

      {/* Date of Birth */}
      {record.date_of_birth && (
        <PersonalInfoRow
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          primary={
            <span className="text-sm text-muted-foreground">
              {translate("resources.contacts.fields.date_of_birth", {
                _: "Nascimento",
              })}
              : {formatLocalizedDate(record.date_of_birth, locale)}
            </span>
          }
        />
      )}

      {/* XP Code */}
      {record.xp_code && (
        <PersonalInfoRow
          icon={<Building className="w-4 h-4 text-muted-foreground" />}
          primary={
            <span className="text-sm text-muted-foreground">
              XP: {record.xp_code}
            </span>
          }
          copyValue={record.xp_code}
        />
      )}
    </div>
  );
};

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
};

const EmailRow = () => {
  const record = useRecordContext<{ email: string }>();

  if (!record) return null;

  return (
    <PersonalInfoRow
      icon={<Mail className="w-4 h-4 text-muted-foreground" />}
      primary={<EmailField source="email" />}
      copyValue={record.email}
    />
  );
};

const PhoneRow = () => {
  const record = useRecordContext<{ number: string; type: string }>();
  const translate = useTranslate();

  if (!record) return null;

  return (
    <PersonalInfoRow
      icon={<Phone className="w-4 h-4 text-muted-foreground" />}
      primary={<TextField source="number" />}
      showType
      copyValue={record.number}
    />
  );
};

const PersonalInfoRow = ({
  icon,
  primary,
  showType,
  copyValue,
}: {
  icon: ReactNode;
  primary: ReactNode;
  showType?: boolean;
  copyValue?: string;
}) => {
  const translate = useTranslate();

  return (
    <div className="flex flex-row items-center gap-x-2 py-1 min-h-6">
      {icon}
      <div className="flex flex-wrap gap-x-2 gap-y-0 text-sm items-center">
        {primary}
        {showType ? (
          <WithRecord
            render={(row) =>
              row.type !== "Other" && (
                <span className="text-muted-foreground">
                  {translatePersonalInfoTypeLabel(row.type, translate)}
                </span>
              )
            }
          />
        ) : null}
        {copyValue && <CopyButton value={copyValue} />}
      </div>
    </div>
  );
};
