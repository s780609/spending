import { relations } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  /** 消費日期 YYYY-MM-DD */
  date: date("date").notNull(),
  /** 店家名稱或手動記帳的描述 */
  vendor: text("vendor").notNull(),
  /** 總金額（發票總額或手動輸入金額） */
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull().default("未分類"),
  /** 發票號碼，手動記帳為 null；unique 用於匯入去重 */
  invoiceNumber: text("invoice_number").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseItems = pgTable("expense_items", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  /** 品項名稱 */
  name: text("name").notNull(),
  /** 小計，可為負數（折抵） */
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  /** 頻率：monthly＝每月、yearly＝每年 */
  frequency: text("frequency").notNull().default("monthly"),
  /** 每月幾號（1-31，超過該月天數時取月底）；每年時為當月幾號 */
  dayOfMonth: integer("day_of_month").notNull(),
  /** 每年的月份（1-12），每月時為 null */
  monthOfYear: integer("month_of_year"),
  /** 名目，如「房租」 */
  vendor: text("vendor").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull().default("未分類"),
  /** 已產生至哪個月 YYYY-MM，用於補帳與防重複 */
  lastGenerated: text("last_generated").notNull(),
  /** 到期月份 YYYY-MM（含當月），null 為無期限 */
  endMonth: text("end_month"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 每月分類預算（每個分類最多一筆，超過即在記帳頁提醒） */
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  /** 對應 categories.ts 的分類名稱 */
  category: text("category").notNull().unique(),
  /** 每月預算金額 */
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  /** "TW" | "US" */
  market: text("market").notNull(),
  /** 券商戶頭名稱 */
  broker: text("broker").notNull(),
  /** 股票代號：台股 2330、美股 AAPL */
  symbol: text("symbol").notNull(),
  /** 顯示名稱（選填） */
  name: text("name"),
  shares: numeric("shares", { precision: 16, scale: 4 }).notNull(),
  /** 最後成功抓到的價格（原幣別），Yahoo 抓不到時墊底用 */
  lastPrice: numeric("last_price", { precision: 14, scale: 4 }),
  lastPriceAt: timestamp("last_price_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** "質押" | "信貸" */
  type: text("type").notNull(),
  principal: numeric("principal", { precision: 14, scale: 2 }).notNull(),
  /** 年利率（%） */
  annualRate: numeric("annual_rate", { precision: 6, scale: 3 }).notNull(),
  startDate: date("start_date").notNull(),
  /** 信貸期數（月） */
  installments: integer("installments"),
  /** 質押期限 */
  termEnd: date("term_end"),
  /** 質押擔保股票代號（維持率計算用） */
  collateralSymbol: text("collateral_symbol"),
  /** 質押擔保股數 */
  collateralShares: numeric("collateral_shares", { precision: 16, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const networthSnapshots = pgTable("networth_snapshots", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  totalAssets: numeric("total_assets", { precision: 16, scale: 2 }).notNull(),
  totalLiabilities: numeric("total_liabilities", {
    precision: 16,
    scale: 2,
  }).notNull(),
  netWorth: numeric("net_worth", { precision: 16, scale: 2 }).notNull(),
  /** 總資產 / 淨資產，淨資產 <= 0 時為 null */
  leverage: numeric("leverage", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fxRates = pgTable("fx_rates", {
  /** 如 "USDTWD" */
  pair: text("pair").primaryKey(),
  rate: numeric("rate", { precision: 12, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** 家庭帳戶月結（台新綜合對帳單） */
export const familyStatements = pgTable("family_statements", {
  id: serial("id").primaryKey(),
  /** YYYY-MM */
  month: text("month").notNull().unique(),
  /** Richart 總資產（目前存款） */
  totalBalance: numeric("total_balance", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 家庭帳戶往來明細 */
export const familyTransactions = pgTable("family_transactions", {
  id: serial("id").primaryKey(),
  account: text("account").notNull(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  withdrawal: numeric("withdrawal", { precision: 14, scale: 2 }),
  deposit: numeric("deposit", { precision: 14, scale: 2 }),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  category: text("category").notNull().default("未分類"),
  /** 匯入去重用 */
  dedupeKey: text("dedupe_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 家庭信用卡月結 */
export const familyCardStatements = pgTable("family_card_statements", {
  id: serial("id").primaryKey(),
  /** 帳單月份 YYYY-MM */
  month: text("month").notNull().unique(),
  newCharges: numeric("new_charges", { precision: 14, scale: 2 }).notNull(),
  totalDue: numeric("total_due", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 家庭信用卡消費明細 */
export const familyCardTransactions = pgTable("family_card_transactions", {
  id: serial("id").primaryKey(),
  /** 所屬帳單月份 YYYY-MM */
  statementMonth: text("statement_month").notNull(),
  purchaseDate: date("purchase_date").notNull(),
  postDate: date("post_date").notNull(),
  description: text("description").notNull(),
  /** 負數為繳款/退款 */
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  cardLast4: text("card_last4").notNull().default(""),
  note: text("note"),
  category: text("category").notNull().default("未分類"),
  dedupeKey: text("dedupe_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 機車基本設定（單列，固定 id = 1） */
export const bikeSettings = pgTable("bike_settings", {
  id: integer("id").primaryKey(),
  /** 時間制項目的起算日（出廠年月或購入日）YYYY-MM-DD，未設定為 null */
  startDate: date("start_date"),
  /** 每換一次機油代表的里程，預設 2000 */
  kmPerOilChange: integer("km_per_oil_change").notNull().default(2000),
  /** 手動校正：實際里程與「換機油次數 × kmPerOilChange」的差，可正可負 */
  mileageAdjustment: integer("mileage_adjustment").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** 機車保養紀錄（每筆服務事件；換機油也是一筆，itemKey = "engine_oil"） */
export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  /** 對應 lib/maintenance.ts 的 MAINTENANCE_ITEMS key */
  itemKey: text("item_key").notNull(),
  /** 保養日期 YYYY-MM-DD */
  date: date("date").notNull(),
  /** 當時估算里程（換機油次數 × kmPerOilChange + 校正） */
  mileage: integer("mileage").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ many }) => ({
  items: many(expenseItems),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseItems.expenseId],
    references: [expenses.id],
  }),
}));
