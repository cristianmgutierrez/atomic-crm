import { useDataProvider, useGetIdentity, type DataProvider } from "ra-core";
import { useCallback, useMemo } from "react";

import type { Company, Tag } from "../types";

export type ContactImportSchema = {
  first_name: string;
  last_name: string;
  gender: string;
  title: string;
  company: string;
  email_work: string;
  email_home: string;
  email_other: string;
  phone_work: string;
  phone_home: string;
  phone_other: string;
  background: string;
  avatar: string;
  first_seen: string;
  last_seen: string;
  has_newsletter: string;
  status: string;
  tags: string;
  linkedin_url: string;
  // Aba 1 — novos
  alias?: string;
  person_type?: string;
  document?: string;
  date_of_birth?: string;
  xp_code?: string;
  monthly_income?: string;
  website?: string;
  // Aba 2 — novos
  segment?: string;
  investor_profile?: string;
  declared_wealth?: string;
  xp_account_type?: string;
  xp_international?: string;
  investment_horizon?: string;
  financial_goal?: string;
  relationship_start_date?: string;
  xp_code_2?: string;
  mb_code?: string;
  avenue_code?: string;
  origin?: string;
  referred_by?: string;
  internal_notes?: string;
  // Aba 3 — novos
  zip_code?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  address_notes?: string;
};

export function useContactImport() {
  const today = new Date().toISOString();
  const user = useGetIdentity();
  const dataProvider = useDataProvider();

  // company cache to avoid creating the same company multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  const companiesCache = useMemo(
    () => new Map<string, Company>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataProvider],
  );
  const getCompanies = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Company>(
        "companies",
        companiesCache,
        names,
        (name) => ({
          name,
          created_at: new Date().toISOString(),
          sales_id: user?.identity?.id,
        }),
        dataProvider,
      ),
    [companiesCache, user?.identity?.id, dataProvider],
  );

  // Tags cache to avoid creating the same tag multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tagsCache = useMemo(() => new Map<string, Tag>(), [dataProvider]);
  const getTags = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Tag>(
        "tags",
        tagsCache,
        names,
        (name) => ({
          name,
          color: "#f9f9f9",
        }),
        dataProvider,
      ),
    [tagsCache, dataProvider],
  );

  const processBatch = useCallback(
    async (batch: ContactImportSchema[]) => {
      const [companies, tags] = await Promise.all([
        getCompanies(
          batch
            .map((contact) => contact.company?.trim())
            .filter((name) => name),
        ),
        getTags(batch.flatMap((batch) => parseTags(batch.tags))),
      ]);

      await Promise.all(
        batch.map(
          async ({
            first_name,
            last_name,
            gender,
            title,
            email_work,
            email_home,
            email_other,
            phone_work,
            phone_home,
            phone_other,
            background,
            first_seen,
            last_seen,
            has_newsletter,
            status,
            company: companyName,
            tags: tagNames,
            linkedin_url,
            alias,
            person_type,
            document,
            date_of_birth,
            xp_code,
            monthly_income,
            website,
            segment,
            investor_profile,
            declared_wealth,
            xp_account_type,
            xp_international,
            investment_horizon,
            financial_goal,
            relationship_start_date,
            xp_code_2,
            mb_code,
            avenue_code,
            origin,
            referred_by,
            internal_notes,
            zip_code,
            address,
            address_number,
            address_complement,
            neighborhood,
            city,
            state,
            country,
            address_notes,
          }) => {
            const email_jsonb = [
              { email: email_work, type: "Work" },
              { email: email_home, type: "Home" },
              { email: email_other, type: "Other" },
            ].filter(({ email }) => email);
            const phone_jsonb = [
              { number: phone_work, type: "Work" },
              { number: phone_home, type: "Home" },
              { number: phone_other, type: "Other" },
            ].filter(({ number }) => number);
            const company = companyName?.trim()
              ? companies.get(companyName.trim())
              : undefined;
            const tagList = parseTags(tagNames)
              .map((name) => tags.get(name))
              .filter((tag): tag is Tag => !!tag);

            return dataProvider.create("contacts", {
              data: {
                first_name,
                last_name,
                gender,
                title,
                email_jsonb,
                phone_jsonb,
                background,
                first_seen: first_seen
                  ? new Date(first_seen).toISOString()
                  : today,
                last_seen: last_seen
                  ? new Date(last_seen).toISOString()
                  : today,
                has_newsletter,
                status,
                company_id: company?.id,
                tags: tagList.map((tag) => tag.id),
                sales_id: user?.identity?.id,
                linkedin_url,
                alias: alias || null,
                person_type: person_type || null,
                document: document || null,
                date_of_birth: date_of_birth || null,
                xp_code: xp_code || null,
                monthly_income: monthly_income
                  ? parseFloat(monthly_income)
                  : null,
                website: website || null,
                segment: segment || null,
                investor_profile: investor_profile || null,
                declared_wealth: declared_wealth
                  ? parseFloat(declared_wealth)
                  : null,
                xp_account_type: xp_account_type || null,
                xp_international:
                  xp_international === "true"
                    ? true
                    : xp_international === "false"
                      ? false
                      : null,
                investment_horizon: investment_horizon || null,
                financial_goal: financial_goal || null,
                relationship_start_date: relationship_start_date || null,
                xp_code_2: xp_code_2 || null,
                mb_code: mb_code || null,
                avenue_code: avenue_code || null,
                origin: origin || null,
                referred_by: referred_by || null,
                internal_notes: internal_notes || null,
                zip_code: zip_code || null,
                address: address || null,
                address_number: address_number || null,
                address_complement: address_complement || null,
                neighborhood: neighborhood || null,
                city: city || null,
                state: state || null,
                country: country || null,
                address_notes: address_notes || null,
              },
            });
          },
        ),
      );
    },
    [dataProvider, getCompanies, getTags, user?.identity?.id, today],
  );

  return processBatch;
}

const fetchRecordsWithCache = async function <T>(
  resource: string,
  cache: Map<string, T>,
  names: string[],
  getCreateData: (name: string) => Partial<T>,
  dataProvider: DataProvider,
) {
  const trimmedNames = [...new Set(names.map((name) => name.trim()))];
  const uncachedRecordNames = trimmedNames.filter((name) => !cache.has(name));

  // check the backend for existing records
  if (uncachedRecordNames.length > 0) {
    const response = await dataProvider.getList(resource, {
      filter: {
        "name@in": `(${uncachedRecordNames
          .map((name) => `"${name}"`)
          .join(",")})`,
      },
      pagination: { page: 1, perPage: trimmedNames.length },
      sort: { field: "id", order: "ASC" },
    });
    for (const record of response.data) {
      cache.set(record.name.trim(), record);
    }
  }

  // create missing records in parallel
  await Promise.all(
    uncachedRecordNames.map(async (name) => {
      if (cache.has(name)) return;
      const response = await dataProvider.create(resource, {
        data: getCreateData(name),
      });
      cache.set(name, response.data);
    }),
  );

  // now all records are in cache, return a map of all records
  return trimmedNames.reduce((acc, name) => {
    acc.set(name, cache.get(name) as T);
    return acc;
  }, new Map<string, T>());
};

const parseTags = (tags: string) =>
  tags
    ?.split(",")
    ?.map((tag: string) => tag.trim())
    ?.filter((tag: string) => tag) ?? [];
