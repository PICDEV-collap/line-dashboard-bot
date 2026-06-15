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

// Row layout in Google Sheets (Financial_Records sheet)
export type FinancialRow = [
  string, // A: ID
  string, // B: Date
  string, // C: ShopID
  string, // D: ShopName
  string, // E: Revenue
  string, // F: Transfer
  string, // G: Cash
  string, // H: Delivery
  string, // I: Expense
  string, // J: Pork
  string, // K: PorkBreakdownJSON
  string, // L: Materials
  string, // M: Supplies
  string, // N: Gas
  string, // O: Labor
  string, // P: Ice
  string, // Q: ExtraExpensesJSON
  string, // R: Profit
  string, // S: MarginPct
  string, // T: Note
  string, // U: Status
  string, // V: CreatedAt
  string, // W: UpdatedAt
];

export const FINANCIAL_HEADERS: string[] = [
  "ID","Date","ShopID","ShopName",
  "Revenue","Transfer","Cash","Delivery",
  "Expense","Pork","PorkBreakdown","Materials","Supplies","Gas","Labor","Ice","ExtraExpenses",
  "Profit","MarginPct","Note","Status","CreatedAt","UpdatedAt",
];

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
export interface ParsedFinancialInput {
  date?: string;
  transfer?: number;
  cash?: number;
  delivery?: number;
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
