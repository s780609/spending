import { getDb } from "@/db";
import {
  familyCardStatements,
  familyCardTransactions,
  familyStatements,
  familyTransactions,
} from "@/db/schema";
import { autoFamilyCategory, familyCardCategory } from "./family-category";
import type { BankStatement, CardStatement } from "./parse-taishin";

export interface ImportCounts {
  inserted: number;
  skipped: number;
}

/** 匯入綜合對帳單：月結 upsert、明細以 dedupeKey 去重 */
export async function importBankStatement(
  parsed: BankStatement,
): Promise<ImportCounts> {
  const db = getDb();
  if (parsed.month && parsed.totalBalance > 0) {
    const values = {
      month: parsed.month,
      totalBalance: parsed.totalBalance.toFixed(2),
    };
    await db
      .insert(familyStatements)
      .values(values)
      .onConflictDoUpdate({ target: familyStatements.month, set: values });
  }

  let inserted = 0;
  for (const tx of parsed.transactions) {
    const dedupeKey = [
      tx.account,
      tx.date,
      tx.description,
      tx.withdrawal ?? "",
      tx.deposit ?? "",
      tx.balance,
    ].join("|");
    const rows = await db
      .insert(familyTransactions)
      .values({
        account: tx.account,
        date: tx.date,
        description: tx.description,
        withdrawal: tx.withdrawal === null ? null : String(tx.withdrawal),
        deposit: tx.deposit === null ? null : String(tx.deposit),
        balance: String(tx.balance),
        note: tx.note || null,
        category: autoFamilyCategory(tx.description, tx.note),
        dedupeKey,
      })
      .onConflictDoNothing()
      .returning({ id: familyTransactions.id });
    inserted += rows.length;
  }
  return { inserted, skipped: parsed.transactions.length - inserted };
}

/** 匯入信用卡帳單：同日同店同金額以出現序號區分，重複匯入仍可去重 */
export async function importCardStatement(
  parsed: CardStatement,
): Promise<ImportCounts> {
  const db = getDb();
  if (parsed.month) {
    const values = {
      month: parsed.month,
      newCharges: parsed.newCharges.toFixed(2),
      totalDue: parsed.totalDue.toFixed(2),
    };
    await db
      .insert(familyCardStatements)
      .values(values)
      .onConflictDoUpdate({ target: familyCardStatements.month, set: values });
  }

  let inserted = 0;
  const seen = new Map<string, number>();
  for (const tx of parsed.transactions) {
    const base = [
      parsed.month,
      tx.cardLast4,
      tx.purchaseDate,
      tx.postDate,
      tx.description,
      tx.amount,
    ].join("|");
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    const rows = await db
      .insert(familyCardTransactions)
      .values({
        statementMonth: parsed.month,
        purchaseDate: tx.purchaseDate,
        postDate: tx.postDate,
        description: tx.description,
        amount: String(tx.amount),
        cardLast4: tx.cardLast4,
        note: tx.note || null,
        category: familyCardCategory(tx.description, tx.amount),
        dedupeKey: `${base}#${occurrence}`,
      })
      .onConflictDoNothing()
      .returning({ id: familyCardTransactions.id });
    inserted += rows.length;
  }
  return { inserted, skipped: parsed.transactions.length - inserted };
}
