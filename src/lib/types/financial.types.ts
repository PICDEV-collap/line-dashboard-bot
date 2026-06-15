// Financial record types — mirrors the HTML dashboard schema exactly

export interface PorkBreakdown {
  redQty: number;
  redPrice: number;
  redTotal: number;
  mincedQty: number;
  mincedPrice: number;
  mincedTotal: number;
  fatQty: number;
  fatPrice: number;
  fatTotal: number;
  total: number;
}

export interface ExtraExpense {
  name: string;
  amount: number;
}

export type RecordStatus = "complete" | "pending" | "draft";

export interface FinancialRecord {
  id: string;
  date: string;              // YYYY-MM-DD
  shopId: string;
  shopName?: string;
  // Revenue breakdown
  revenue: number;           // transfer + cash + delivery
  transfer: number;
  cash: number;
  delivery: number;
  // Expense breakdown
  expense: number;           // sum of all below
  pork: number;              // total pork cost
  porkBreakdown?: PorkBreakdown;
  materials: number;
  supplies: number;
  gas: number;
  labor: number;
  ice: number;
  extraExpenses: ExtraExpense[];
  extraIncome: ExtraIncome[];
  // Summary
  profit: number;            // revenue - expense
  marginPct: number;         // profit / revenue * 100
  // Metadata
  note: string;
  status: RecordStatus;
  incomplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// Aggregated stats for dashboard KPIs
export interface FinancialStats {
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  avgMarginPct: number;
  totalDays: number;
  profitDays: number;
  lossDays: number;
  avgDailyRevenue: number;
  avgDailyProfit: number;
  byPaymentMethod: {
    transfer: number;
    cash: number;
    delivery: number;
  };
  byExpenseCategory: {
    pork: number;
    materials: number;
    supplies: number;
    gas: number;
    labor: number;
    ice: number;
    extra: number;
  };
  recentRecords: FinancialRecord[];
}

// Parsed output from Gemini financial parser
export interface ExtraIncome {
  name: string;
  amount: number;
}

export interface ParsedFinancialInput {
  date?: string;
  shopId?: string;
  shopName?: string;
  transfer?: number;
  cash?: number;
  delivery?: number;
  extraIncome?: ExtraIncome[];
  porkRed?: { qty: number; price: number };
  porkMinced?: { qty: number; price: number };
  porkFat?: { qty: number; price: number };
  materials?: number;
  supplies?: number;
  gas?: number;
  labor?: number;
  ice?: number;
  extraExpenses?: ExtraExpense[];
  note?: string;
  confidence: number;
  isFinancialData: boolean;
}
