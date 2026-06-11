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

export const expensesRelations = relations(expenses, ({ many }) => ({
  items: many(expenseItems),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseItems.expenseId],
    references: [expenses.id],
  }),
}));
