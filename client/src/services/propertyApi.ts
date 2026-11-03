import { apiRequest } from "./apiClient";

export type PropertyStatus = "active" | "archived" | "sold";
export type PropertyType =
  | "apartment"
  | "house"
  | "commercial"
  | "land"
  | "other";

export type PropertyTransaction = {
  id: string;
  type: "income" | "expense";
  category: string;
  customCategory: string | null;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
};

export type PropertyRecord = {
  id: string;
  name: string;
  location: string;
  type: PropertyType;
  totalInvestment: number | null;
  purchaseDate: string;
  sizeSqm: number | null;
  rooms: number | null;
  notes: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
};

export type PropertyInput = Omit<
  PropertyRecord,
  "id" | "status" | "createdAt" | "updatedAt" | "type" | "sizeSqm" | "rooms"
> & {
  type?: PropertyType;
};

export const propertyApi = {
  async list() {
    const result = await apiRequest<{ properties: PropertyRecord[] }>(
      "/api/properties",
    );
    return result.properties;
  },

  async get(id: string) {
    const result = await apiRequest<{ property: PropertyRecord }>(
      `/api/properties/${id}`,
    );
    return result.property;
  },

  async create(input: PropertyInput, onSuccess?: (message: string) => void) {
    const result = await apiRequest<{ property: PropertyRecord }>(
      "/api/properties",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      onSuccess,
    );
    return result.property;
  },

  async update(
    id: string,
    input: PropertyInput,
    onSuccess?: (message: string) => void,
  ) {
    const result = await apiRequest<{ property: PropertyRecord }>(
      `/api/properties/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
      onSuccess,
    );
    return result.property;
  },

  async delete(id: string, onSuccess?: (message: string) => void) {
    await apiRequest<null>(
      `/api/properties/${id}`,
      { method: "DELETE" },
      onSuccess,
    );
  },

  async setStatus(
    id: string,
    status: Exclude<PropertyStatus, "active">,
    onSuccess?: (message: string) => void,
  ) {
    const result = await apiRequest<{ property: PropertyRecord }>(
      `/api/properties/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      onSuccess,
    );
    return result.property;
  },

  async monthlyTransactions(id: string, month: string) {
    const result = await apiRequest<{ transactions: PropertyTransaction[] }>(
      `/api/properties/${id}/transactions?month=${encodeURIComponent(month)}`,
    );
    return result.transactions;
  },

  async yearlyTransactions(id: string, year: number) {
    const result = await apiRequest<{ transactions: PropertyTransaction[] }>(
      `/api/properties/${id}/transactions?year=${year}`,
    );
    return result.transactions;
  },

  async allTransactions(id: string) {
    const result = await apiRequest<{ transactions: PropertyTransaction[] }>(
      `/api/properties/${id}/transactions?all=true`,
    );
    return result.transactions;
  },

  async addTransaction(
    id: string,
    input: Omit<PropertyTransaction, "id" | "createdAt">,
    onSuccess?: (message: string) => void,
  ) {
    const result = await apiRequest<{ transaction: PropertyTransaction }>(
      `/api/properties/${id}/transactions`,
      { method: "POST", body: JSON.stringify(input) },
      onSuccess,
    );
    return result.transaction;
  },

  async deleteTransaction(
    id: string,
    transactionId: string,
    onSuccess?: (message: string) => void,
  ) {
    await apiRequest<null>(
      `/api/properties/${id}/transactions/${transactionId}`,
      {
        method: "DELETE",
      },
      onSuccess,
    );
  },
};
