import {
  company as fakerCompany,
  internet,
  lorem,
  name,
  phone,
  random,
} from "faker/locale/en_US";

import { defaultContactStatuses } from "../../../root/defaultConfiguration";
import { contactGender } from "../../../contacts/contactModel";
import type { Company, Contact } from "../../../types";
import type { Db } from "./types";
import { randomDate, weightedBoolean } from "./utils";

const maxContacts = {
  1: 1,
  10: 4,
  50: 12,
  250: 25,
  500: 50,
};

const getRandomContactDetailsType = () =>
  random.arrayElement(["Work", "Home", "Other"]) as "Work" | "Home" | "Other";

export const generateContacts = (db: Db, size = 500): Required<Contact>[] => {
  const nbAvailblePictures = 223;
  let numberOfContacts = 0;

  return Array.from(Array(size).keys()).map((id) => {
    const has_avatar =
      weightedBoolean(25) && numberOfContacts < nbAvailblePictures;
    const gender = random.arrayElement(contactGender).value;
    const first_name = name.firstName(gender as any);
    const last_name = name.lastName();
    const email_jsonb = [
      {
        email: internet.email(first_name, last_name),
        type: getRandomContactDetailsType(),
      },
    ];
    const phone_jsonb = [
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
      {
        number: phone.phoneNumber(),
        type: getRandomContactDetailsType(),
      },
    ];
    const avatar = {
      src: has_avatar
        ? "https://marmelab.com/posters/avatar-" +
          (223 - numberOfContacts) +
          ".jpeg"
        : undefined,
    };
    const title = fakerCompany.bsAdjective();

    if (has_avatar) {
      numberOfContacts++;
    }

    // choose company with people left to know
    let company: Required<Company>;
    do {
      company = random.arrayElement(db.companies);
    } while (company.nb_contacts >= maxContacts[company.size]);
    company.nb_contacts++;

    const first_seen = randomDate(new Date(company.created_at)).toISOString();
    const last_seen = first_seen;

    const personType = random.arrayElement(["PF", "PJ"]);
    const segments = ["Digital", "Exclusive", "Signature", "Unique", "Private"];
    const horizons = ["Curto Prazo", "Médio Prazo", "Longo Prazo"];
    const goals = [
      "Aposentadoria",
      "Preservação de Capital",
      "Crescimento",
      "Renda Passiva",
    ];
    const origins = ["Indicação", "Prospecção", "Campanha", "Evento"];
    const brazilStates = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "GO"];

    return {
      id,
      first_name,
      last_name,
      gender,
      title: title.charAt(0).toUpperCase() + title.substr(1),
      company_id: company.id,
      company_name: company.name,
      email_jsonb,
      phone_jsonb,
      background: lorem.sentence(),
      acquisition: random.arrayElement(["inbound", "outbound"]),
      avatar,
      first_seen: first_seen,
      last_seen: last_seen,
      has_newsletter: weightedBoolean(30),
      status: random.arrayElement(defaultContactStatuses).value,
      tags: random
        .arrayElements(db.tags, random.arrayElement([0, 0, 0, 1, 1, 2]))
        .map((tag) => tag.id),
      sales_id: company.sales_id,
      nb_tasks: 0,
      linkedin_url: null,
      // Aba 1 — novos
      alias: weightedBoolean(60) ? name.firstName() : null,
      person_type: personType,
      document: null,
      date_of_birth:
        personType === "PF"
          ? `${random.number({ min: 1, max: 28 }).toString().padStart(2, "0")}/${random.number({ min: 1, max: 12 }).toString().padStart(2, "0")}/${random.number({ min: 1950, max: 2000 })}`
          : null,
      xp_code: weightedBoolean(70)
        ? `XP${random.number({ min: 10000, max: 99999 })}`
        : null,
      monthly_income: weightedBoolean(50)
        ? random.number({ min: 5000, max: 100000 })
        : null,
      website: null,
      // Aba 2 — novos
      segment: random.arrayElement(segments),
      investor_profile: random.arrayElement([
        "Regular",
        "Qualificado",
        "Profissional",
      ]),
      declared_wealth: random.number({ min: 100000, max: 10000000 }),
      xp_account_type: random.arrayElement([
        "Assessorado",
        "Autônomo",
        "Institucional",
      ]),
      xp_international: weightedBoolean(30),
      investment_horizon: random.arrayElement(horizons),
      financial_goal: random.arrayElement(goals),
      relationship_start_date: `${random.number({ min: 1, max: 28 }).toString().padStart(2, "0")}/${random.number({ min: 1, max: 12 }).toString().padStart(2, "0")}/${random.number({ min: 2015, max: 2024 })}`,
      xp_code_2: null,
      mb_code: weightedBoolean(40)
        ? `MB${random.number({ min: 1000, max: 9999 })}`
        : null,
      avenue_code: null,
      origin: random.arrayElement(origins),
      referred_by: null,
      cross_sell_opportunities: random.arrayElements(
        ["Banking", "Cartão de Crédito", "Previdência", "Seguro de Vida"],
        random.number({ min: 0, max: 2 }),
      ),
      internal_notes: weightedBoolean(40) ? lorem.sentence() : null,
      // Aba 3 — novos
      zip_code: null,
      address: null,
      address_number: null,
      address_complement: null,
      neighborhood: null,
      city: random.arrayElement([
        "São Paulo",
        "Rio de Janeiro",
        "Belo Horizonte",
        "Porto Alegre",
        "Curitiba",
      ]),
      state: random.arrayElement(brazilStates),
      country: "Brasil",
      address_notes: null,
    };
  });
};
