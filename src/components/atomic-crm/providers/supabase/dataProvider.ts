import { supabaseDataProvider } from "ra-supabase-core";
import {
  withLifecycleCallbacks,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import type {
  Deal,
  RAFile,
  Sale,
  SalesFormData,
  SignUpData,
  Task,
} from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { ATTACHMENTS_BUCKET } from "../commons/attachments";
import { getCurrentEscritorioId, getIsInitialized } from "./authProvider";
import { getSupabaseClient } from "./supabase";

// 7 days. The bucket is private; signed URLs are the only way to access objects.
// On every read we re-sign (refreshAttachmentUrls) so persisted URLs going stale
// is not a correctness issue — it just means the user has to refetch the record.
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

type UploadScope = "task" | "company" | "sale" | "config";

const getBaseDataProvider = () =>
  supabaseDataProvider({
    instanceUrl: import.meta.env.VITE_SUPABASE_URL,
    apiKey: import.meta.env.VITE_SB_PUBLISHABLE_KEY,
    supabaseClient: getSupabaseClient(),
    sortOrder: "asc,desc.nullslast" as any,
  });

const processCompanyLogo = async (params: any) => {
  const logo = params.data.logo;

  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo, "company");
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

const getDataProviderWithCustomMethods = () => {
  const baseDataProvider = getBaseDataProvider();

  return {
    ...baseDataProvider,
    async getList(resource: string, params: GetListParams) {
      if (resource === "companies") {
        return baseDataProvider.getList("companies_summary", params);
      }
      if (resource === "contacts") {
        return baseDataProvider.getList("contacts_summary", params);
      }
      if (resource === "activity_log") {
        const { data, total } = await baseDataProvider.getList(
          "activity_log",
          params,
        );
        // Rename snake_case view columns to camelCase to match Activity type
        return {
          data: data.map((row: any) => ({
            ...row,
            contactNote: row.contact_note ?? undefined,
            dealNote: row.deal_note ?? undefined,
            contact_note: undefined,
            deal_note: undefined,
          })),
          total,
        };
      }

      return baseDataProvider.getList(resource, params);
    },
    async getOne(resource: string, params: any) {
      if (resource === "companies") {
        return baseDataProvider.getOne("companies_summary", params);
      }
      if (resource === "contacts") {
        return baseDataProvider.getOne("contacts_summary", params);
      }

      return baseDataProvider.getOne(resource, params);
    },

    async signUp({ email, password, first_name, last_name }: SignUpData) {
      const response = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name,
            last_name,
          },
        },
      });

      if (!response.data?.user || response.error) {
        console.error("signUp.error", response.error);
        throw new Error(response?.error?.message || "Failed to create account");
      }

      // Update the is initialized cache
      getIsInitialized._is_initialized_cache = true;

      return {
        id: response.data.user.id,
        email,
        password,
      };
    },
    async salesCreate(body: SalesFormData) {
      const { data, error } = await getSupabaseClient().functions.invoke<{
        data: Sale;
      }>("users", {
        method: "POST",
        body,
      });

      if (!data || error) {
        console.error("salesCreate.error", error);
        const errorDetails = await (async () => {
          try {
            return (await error?.context?.json()) ?? {};
          } catch {
            return {};
          }
        })();
        throw new Error(errorDetails?.message || "Failed to create the user");
      }

      return data.data;
    },
    async salesUpdate(
      id: Identifier,
      data: Partial<Omit<SalesFormData, "password">>,
    ) {
      const {
        email,
        first_name,
        last_name,
        administrator,
        avatar: avatarData,
        disabled,
        escritorio_id,
        papel,
      } = data;

      let avatar:
        | Pick<RAFile, "src" | "path" | "title" | "type">
        | string
        | null
        | undefined = undefined;
      if (avatarData !== undefined) {
        if (avatarData && (avatarData as any).rawFile) {
          const uploaded = await uploadToBucket(avatarData as RAFile, "sale");
          avatar = {
            src: uploaded.src,
            path: uploaded.path,
            title: uploaded.title,
            type: uploaded.type,
          };
        } else {
          avatar = avatarData as string | null;
        }
      }

      const { data: updatedData, error } =
        await getSupabaseClient().functions.invoke<{
          data: Sale;
        }>("users", {
          method: "PATCH",
          body: {
            sales_id: id,
            email,
            first_name,
            last_name,
            administrator,
            disabled,
            avatar,
            escritorio_id,
            papel,
          },
        });

      if (!updatedData || error) {
        console.error("salesCreate.error", error);
        throw new Error("Failed to update account manager");
      }

      return updatedData.data;
    },
    async updatePassword(id: Identifier) {
      const { data: passwordUpdated, error } =
        await getSupabaseClient().functions.invoke<boolean>("update_password", {
          method: "PATCH",
          body: {
            sales_id: id,
          },
        });

      if (!passwordUpdated || error) {
        console.error("update_password.error", error);
        throw new Error("Failed to update password");
      }

      return passwordUpdated;
    },
    async unarchiveDeal(deal: Deal) {
      // get all deals where stage is the same as the deal to unarchive
      const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
        filter: { stage: deal.stage },
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "index", order: "ASC" },
      });

      // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
      const updatedDeals = deals.map((d, index) => ({
        ...d,
        index: d.id === deal.id ? 0 : index + 1,
        archived_at: d.id === deal.id ? null : d.archived_at,
      }));

      return await Promise.all(
        updatedDeals.map((updatedDeal) =>
          baseDataProvider.update("deals", {
            id: updatedDeal.id,
            data: updatedDeal,
            previousData: deals.find((d) => d.id === updatedDeal.id),
          }),
        ),
      );
    },
    async isInitialized() {
      return getIsInitialized();
    },
    async mergeContacts(sourceId: Identifier, targetId: Identifier) {
      const { data, error } = await getSupabaseClient().functions.invoke(
        "merge_contacts",
        {
          method: "POST",
          body: { loserId: sourceId, winnerId: targetId },
        },
      );

      if (error) {
        console.error("merge_contacts.error", error);
        throw new Error("Failed to merge contacts");
      }

      return data;
    },
    async getConfiguration(): Promise<ConfigurationContextValue> {
      const { data } = await baseDataProvider.getOne("configuration", {
        id: 1,
      });
      const config = (data?.config as Record<string, unknown>) ?? {};
      // Backward compat: strip legacy fields moved to pipelines table
      const { dealStages: _, dealPipelineStatuses: __, ...rest } = config;
      return rest as ConfigurationContextValue;
    },
    async updateConfiguration(
      config: ConfigurationContextValue,
    ): Promise<ConfigurationContextValue> {
      const { data } = await baseDataProvider.update("configuration", {
        id: 1,
        data: { config },
        previousData: { id: 1 },
      });
      return data.config as ConfigurationContextValue;
    },
  } satisfies DataProvider;
};

export type CrmDataProvider = ReturnType<
  typeof getDataProviderWithCustomMethods
>;

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo, "config");
    return logo.src;
  }
  return logo?.src ?? "";
};

const lifeCycleCallbacks: ResourceCallbacks[] = [
  {
    resource: "configuration",
    beforeUpdate: async (params) => {
      const config = params.data.config;
      if (config) {
        config.lightModeLogo = await processConfigLogo(config.lightModeLogo);
        config.darkModeLogo = await processConfigLogo(config.darkModeLogo);
      }
      return params;
    },
  },
  {
    resource: "tasks",
    beforeSave: async (data: Task, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi) => uploadToBucket(fi, "task")),
        );
      }
      return data;
    },
    afterGetOne: async (result) => {
      result.data = await refreshTaskAttachments(result.data as Task);
      return result;
    },
    afterGetList: async (result) => {
      result.data = await Promise.all(
        (result.data as Task[]).map((t) => refreshTaskAttachments(t)),
      );
      return result;
    },
    afterGetMany: async (result) => {
      result.data = await Promise.all(
        (result.data as Task[]).map((t) => refreshTaskAttachments(t)),
      );
      return result;
    },
    afterGetManyReference: async (result) => {
      result.data = await Promise.all(
        (result.data as Task[]).map((t) => refreshTaskAttachments(t)),
      );
      return result;
    },
  },
  {
    resource: "sales",
    beforeSave: async (data: Sale, _, __) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar, "sale");
      }
      return data;
    },
    afterGetOne: async (result) => {
      result.data = await refreshAvatar(result.data as Sale);
      return result;
    },
    afterGetList: async (result) => {
      result.data = await Promise.all(
        (result.data as Sale[]).map((s) => refreshAvatar(s)),
      );
      return result;
    },
    afterGetMany: async (result) => {
      result.data = await Promise.all(
        (result.data as Sale[]).map((s) => refreshAvatar(s)),
      );
      return result;
    },
  },
  {
    resource: "contacts",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "first_name",
        "last_name",
        "alias",
        "company_name",
        "title",
        "email",
        "phone",
        "document",
        "xp_code",
        "segment",
        "investor_profile",
        "xp_account_type",
        "city",
        "state",
        "country",
        "background",
      ])(params);
    },
  },
  {
    resource: "companies",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "name",
        "phone_number",
        "website",
        "zipcode",
        "city",
        "state_abbr",
      ])(params);
    },
    beforeCreate: async (params) => {
      const createParams = await processCompanyLogo(params);

      return {
        ...createParams,
        data: {
          created_at: new Date().toISOString(),
          ...createParams.data,
        },
      };
    },
    beforeUpdate: async (params) => {
      return await processCompanyLogo(params);
    },
    afterGetOne: async (result) => {
      result.data = await refreshLogo(result.data as any);
      return result;
    },
    afterGetList: async (result) => {
      result.data = await Promise.all(
        (result.data as any[]).map((c) => refreshLogo(c)),
      );
      return result;
    },
    afterGetMany: async (result) => {
      result.data = await Promise.all(
        (result.data as any[]).map((c) => refreshLogo(c)),
      );
      return result;
    },
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["first_name", "last_name"])(params);
    },
  },
  {
    resource: "deals",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["name", "category", "description"])(params);
    },
  },
];

export const getDataProvider = () => {
  if (import.meta.env.VITE_SUPABASE_URL === undefined) {
    throw new Error("Please set the VITE_SUPABASE_URL environment variable");
  }
  if (import.meta.env.VITE_SB_PUBLISHABLE_KEY === undefined) {
    throw new Error(
      "Please set the VITE_SB_PUBLISHABLE_KEY environment variable",
    );
  }
  return withLifecycleCallbacks(
    getDataProviderWithCustomMethods(),
    lifeCycleCallbacks,
  ) as CrmDataProvider;
};

const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email")
          return {
            ...acc,
            [`email_fts@ilike`]: q,
          };
        if (column === "phone")
          return {
            ...acc,
            [`phone_fts@ilike`]: q,
          };
        else
          return {
            ...acc,
            [`${column}@ilike`]: q,
          };
      }, {}),
    },
  };
};

// Path layout in the (private) attachments bucket:
//   escritorios/{escritorio_id}/tasks|companies|sales/...   → tenant-scoped
//   configs/...                                              → global (single-row config)
// Storage RLS policies (07_storage.sql) enforce that the prefix matches the caller's
// escritorio (or the caller is admin). Callers that lack an escritorio context fall back
// to `configs/` only when scope === 'config'.
const buildStoragePath = async (
  scope: UploadScope,
  fileName: string,
): Promise<string> => {
  if (scope === "config") {
    return `configs/${fileName}`;
  }
  const escritorioId = await getCurrentEscritorioId();
  if (escritorioId == null) {
    throw new Error(
      "Cannot upload attachment: current user has no escritorio_id",
    );
  }
  const folder =
    scope === "task" ? "tasks" : scope === "company" ? "companies" : "sales";
  return `escritorios/${escritorioId}/${folder}/${fileName}`;
};

const signUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await getSupabaseClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

const uploadToBucket = async (fi: RAFile, scope: UploadScope) => {
  const supabase = getSupabaseClient();

  // Already uploaded (no new content) — just refresh the signed URL so it doesn't
  // expire mid-session. If signing fails the path is gone or RLS denied; fall through
  // to the re-upload path so the user doesn't lose data silently.
  if (!fi.src?.startsWith("blob:") && !fi.src?.startsWith("data:") && fi.path) {
    const refreshed = await signUrl(fi.path);
    if (refreshed) {
      fi.src = refreshed;
      return fi;
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src)
        .then((res) => (res.status !== 200 ? null : res.blob()))
        .catch(() => null)
    : fi.rawFile;

  if (dataContent == null) {
    return fi;
  }

  const file = fi.rawFile;
  const fileParts = file.name.split(".");
  const fileExt = fileParts.length > 1 ? `.${file.name.split(".").pop()}` : "";
  const fileName = `${Math.random()}${fileExt}`;
  const filePath = await buildStoragePath(scope, fileName);

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  const signed = await signUrl(filePath);
  if (!signed) {
    throw new Error("Failed to sign URL for newly uploaded attachment");
  }

  fi.path = filePath;
  fi.src = signed;
  fi.type = file.type;

  return fi;
};

// Refresh signed URLs on records returned from the API. Persisted `src` values
// expire (TTL above), so every read replaces them with a freshly signed URL.
// Skips items without a path (legacy/imported entries that point to external URLs).
const refreshSignedUrls = async <T extends { path?: string; src?: string }>(
  files: T[] | null | undefined,
): Promise<T[] | null | undefined> => {
  if (!files || files.length === 0) return files;
  const paths = files.map((f) => f?.path).filter((p): p is string => !!p);
  if (paths.length === 0) return files;

  const { data, error } = await getSupabaseClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return files;

  const byPath = new Map(
    data
      .filter((d) => d.path && d.signedUrl)
      .map((d) => [d.path as string, d.signedUrl]),
  );
  return files.map((f) =>
    f?.path && byPath.has(f.path) ? { ...f, src: byPath.get(f.path)! } : f,
  );
};

const refreshTaskAttachments = async <T extends { attachments?: any[] }>(
  task: T,
): Promise<T> => {
  if (!task?.attachments?.length) return task;
  const refreshed = await refreshSignedUrls(task.attachments);
  return { ...task, attachments: refreshed ?? task.attachments };
};

const refreshAvatar = async <T extends { avatar?: any }>(
  record: T,
): Promise<T> => {
  if (!record?.avatar?.path) return record;
  const refreshed = await refreshSignedUrls([record.avatar]);
  return { ...record, avatar: refreshed?.[0] ?? record.avatar };
};

const refreshLogo = async <T extends { logo?: any }>(record: T): Promise<T> => {
  if (!record?.logo?.path) return record;
  const refreshed = await refreshSignedUrls([record.logo]);
  return { ...record, logo: refreshed?.[0] ?? record.logo };
};
