import type { FinancialRecord } from "@/lib/types/financial.types";

export type DashboardTab = "dashboard" | "records" | "analysis" | "report" | "setup";

export interface ApiConfig {
  url: string;
  key: string;
}

export interface FilterState {
  month: string;
  dateFrom: string;
  dateTo: string;
  shop: string;
  profitLoss: string;
}

export interface RecordFilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  shop: string;
  status: string;
  sort: string;
}

export interface SyncStatus {
  state: "online" | "syncing" | "offline";
  message: string;
  lastUpdated: string;
}

export interface ExtraItem {
  id: string;
  title: string;
  amount: number;
}
