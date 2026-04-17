// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addObservationToContact,
  getOrCreateCompanyFromDomain,
  getOrCreateContactFromEmailInfo,
} from "./addObservationToContact";

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("../_shared/supabaseAdmin.ts", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("addObservationToContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    vi.resetAllMocks();
  });
  describe("getOrCreateCompanyFromDomain", () => {
    it("returns the existing company when it already exists in the database", async () => {
      const existingCompany = { id: 1, name: "acme.com", sales_id: 42 };
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: existingCompany, error: null }),
          }),
        }),
      });

      const result = await getOrCreateCompanyFromDomain("acme.com", 42);

      expect(result).toEqual(existingCompany);
      expect(mockFrom).toHaveBeenCalledWith("companies");
    });

    it("throws when fetching the company fails", async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      await expect(
        getOrCreateCompanyFromDomain("acme.com", 42),
      ).rejects.toThrow(
        "Could not fetch companies from database, name: acme.com, error: DB error",
      );
    });

    it("returns null for a known mail provider domain without creating a company", async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      });

      const result = await getOrCreateCompanyFromDomain("gmail.com", 42);

      expect(result).toBeNull();
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("creates and returns a new company when it does not exist and domain is not a mail provider", async () => {
      const newCompany = { id: 2, name: "acme.com", sales_id: 42 };
      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () => Promise.resolve({ data: [newCompany], error: null }),
          }),
        });

      const result = await getOrCreateCompanyFromDomain("acme.com", 42);

      expect(result).toEqual(newCompany);
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenNthCalledWith(2, "companies");
    });

    it("throws when creating the company fails", async () => {
      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () =>
              Promise.resolve({
                data: null,
                error: { message: "Insert failed" },
              }),
          }),
        });

      await expect(
        getOrCreateCompanyFromDomain("acme.com", 42),
      ).rejects.toThrow(
        "Could not create company in database, name: acme.com, error: Insert failed",
      );
    });
  });

  describe("getOrCreateContactFromEmailInfo", () => {
    const contactParams = {
      email: "alice@acme.com",
      firstName: "Alice",
      lastName: "Smith",
      salesId: 42,
      domain: "acme.com",
    };

    it("returns the existing contact when it already exists in the database", async () => {
      const existingContact = {
        id: 10,
        first_name: "Alice",
        last_name: "Smith",
      };
      mockFrom.mockReturnValue({
        select: () => ({
          contains: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: existingContact, error: null }),
          }),
        }),
      });

      const result = await getOrCreateContactFromEmailInfo(contactParams);

      expect(result).toEqual(existingContact);
      expect(mockFrom).toHaveBeenCalledWith("contacts");
    });

    it("throws when fetching the contact fails", async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          contains: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: "DB error" } }),
          }),
        }),
      });

      await expect(
        getOrCreateContactFromEmailInfo(contactParams),
      ).rejects.toThrow(
        "Could not fetch contact from database, email: alice@acme.com, error: DB error",
      );
    });

    it("creates and returns a new contact with the associated company", async () => {
      const newContact = {
        id: 11,
        first_name: "Alice",
        last_name: "Smith",
        company_id: 1,
      };
      const existingCompany = { id: 1, name: "acme.com", sales_id: 42 };

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: existingCompany, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () => Promise.resolve({ data: [newContact], error: null }),
          }),
        });

      const result = await getOrCreateContactFromEmailInfo(contactParams);

      expect(result).toEqual(newContact);
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });

    it("creates a contact with null company_id when domain is a mail provider", async () => {
      const newContact = {
        id: 12,
        first_name: "Alice",
        last_name: "Smith",
        company_id: null,
      };

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () => Promise.resolve({ data: [newContact], error: null }),
          }),
        });

      const result = await getOrCreateContactFromEmailInfo({
        ...contactParams,
        email: "alice@gmail.com",
        domain: "gmail.com",
      });

      expect(result).toEqual(newContact);
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });

    it("throws when creating the contact fails", async () => {
      const existingCompany = { id: 1, name: "acme.com", sales_id: 42 };

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: existingCompany, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => ({
            select: () =>
              Promise.resolve({
                data: null,
                error: { message: "Insert failed" },
              }),
          }),
        });

      await expect(
        getOrCreateContactFromEmailInfo(contactParams),
      ).rejects.toThrow(
        "Could not create contact in database, email: alice@acme.com, error: Insert failed",
      );
    });
  });

  describe("addObservationToContact", () => {
    const baseParams = {
      salesEmail: "sales@company.com",
      email: "alice@acme.com",
      domain: "acme.com",
      firstName: "Alice",
      lastName: "Smith",
      noteContent: "An observation",
      attachments: [],
    };

    it("creates an observation task and returns undefined on success", async () => {
      const salesRecord = { id: 1, email: "sales@company.com" };
      const existingContact = {
        id: 10,
        first_name: "Alice",
        last_name: "Smith",
      };

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: salesRecord, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: existingContact, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () => Promise.resolve({ error: null }),
        });

      const result = await addObservationToContact(baseParams);

      expect(result).toBeUndefined();
      // sales fetch + contact fetch + tasks insert (last_seen handled by trigger)
      expect(mockFrom).toHaveBeenCalledTimes(3);
      expect(mockFrom).toHaveBeenNthCalledWith(3, "tasks");
    });

    it("returns 500 when inserting the observation task fails", async () => {
      const salesRecord = { id: 1, email: "sales@company.com" };
      const existingContact = {
        id: 10,
        first_name: "Alice",
        last_name: "Smith",
      };

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: salesRecord, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: existingContact, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: () =>
            Promise.resolve({ error: { message: "Insert failed" } }),
        });

      const response = await addObservationToContact(baseParams);

      expect(response).toBeInstanceOf(Response);
      expect(response!.status).toBe(500);
      expect(await response!.text()).toBe(
        "Could not add observation to contact alice@acme.com, sales sales@company.com",
      );
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });

    it("returns 500 when getOrCreateContactFromEmailInfo throws", async () => {
      const salesRecord = { id: 1, email: "sales@company.com" };
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: salesRecord, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: () => ({
            contains: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: { message: "DB error" } }),
            }),
          }),
        });

      const response = await addObservationToContact(baseParams);

      expect(response).toBeInstanceOf(Response);
      expect(response!.status).toBe(500);
      expect(await response!.text()).toBe(
        "Could not get or create contact from database, email: alice@acme.com, sales: sales@company.com",
      );
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
