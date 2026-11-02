import { and, asc, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { getDb } from "../db";
import { familyTransactions } from "../db/schema";
import { shiftMonth } from "./dates";

/** 要補的月份與補登日期（每月 25 號轉帳，遇假日順延：2026-01-25 為週日 → 01-26） */
const TARGETS = [
  { month: "2026-01", date: "2026-01-26" },
  { month: "2026-02", date: "2026-02-25" },
] as const;

const RENT = "房租";

/** 從摘要＋備註取出收款帳號特徵，如「807-00133018**」「**8604」 */
export function payeeTokens(text: string): string[] {
  return text.match(/\d{3}-\d{4,}\**|\*{2}\d{4}/g) ?? [];
}

/** 判斷候選明細是否轉給同一個收款人（帳號特徵都出現；取不到特徵時摘要＋備註須完全相同） */
export function isSamePayee(
  candidate: { description: string; note: string | null },
  template: { description: string; note: string | null },
): boolean {
  const templateText = `${template.description} ${template.note ?? ""}`;
  const candidateText = `${candidate.description} ${candidate.note ?? ""}`;
  const tokens = payeeTokens(templateText);
  if (tokens.length === 0) {
    return templateText === candidateText;
  }
  return tokens.every((token) => candidateText.includes(token));
}

/**
 * 一次性補帳：家庭帳戶 2026 年 1、2 月的房租。
 * 以 2026 年第一筆「房租」帳戶明細為範本（帳戶、摘要、備註、金額）：
 * 1. 該月已有房租 → 略過
 * 2. 該月有同收款人、同金額但分類不是房租的轉帳（備註沒寫「房租」被分到未分類／其他）→ 改分類為房租
 * 3. 都沒有 → 新增一筆補登明細（dedupeKey 固定，重複執行不會多插）
 * 開頁時呼叫，可重複執行；確認補上後即可刪除此檔與呼叫處。
 */
export async function backfillFamilyRent2026(): Promise<void> {
  const db = getDb();
  const [template] = await db
    .select()
    .from(familyTransactions)
    .where(
      and(
        eq(familyTransactions.category, RENT),
        isNotNull(familyTransactions.withdrawal),
        gte(familyTransactions.date, "2026-03-01"),
        lt(familyTransactions.date, "2027-01-01"),
      ),
    )
    .orderBy(asc(familyTransactions.date), asc(familyTransactions.id))
    .limit(1);
  if (!template || template.withdrawal === null) {
    return;
  }
  const amount = Number(template.withdrawal);

  for (const target of TARGETS) {
    const monthRows = await db
      .select()
      .from(familyTransactions)
      .where(
        and(
          gte(familyTransactions.date, `${target.month}-01`),
          lt(familyTransactions.date, `${shiftMonth(target.month, 1)}-01`),
        ),
      )
      .orderBy(asc(familyTransactions.date), asc(familyTransactions.id));

    if (monthRows.some((row) => row.category === RENT)) {
      continue;
    }

    const match = monthRows.find(
      (row) =>
        row.withdrawal !== null &&
        Number(row.withdrawal) === amount &&
        isSamePayee(row, template),
    );
    if (match) {
      await db
        .update(familyTransactions)
        .set({ category: RENT })
        .where(eq(familyTransactions.id, match.id));
      continue;
    }

    // 餘額以同帳戶前一筆推算（僅顯示用，不參與任何統計）
    const [previous] = await db
      .select({ balance: familyTransactions.balance })
      .from(familyTransactions)
      .where(
        and(
          eq(familyTransactions.account, template.account),
          lt(familyTransactions.date, target.date),
        ),
      )
      .orderBy(desc(familyTransactions.date), desc(familyTransactions.id))
      .limit(1);
    const balance = previous ? Number(previous.balance) - amount : 0;

    await db
      .insert(familyTransactions)
      .values({
        account: template.account,
        date: target.date,
        description: template.description,
        withdrawal: template.withdrawal,
        deposit: null,
        balance: balance.toFixed(2),
        note: template.note ? `${template.note} 補登` : "補登",
        category: RENT,
        dedupeKey: `backfill|${RENT}|${target.month}`,
      })
      .onConflictDoNothing();
  }
}
