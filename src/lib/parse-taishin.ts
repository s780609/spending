/** PDF 文字片段（pdfjs textContent item 簡化版） */
export interface PdfItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

interface Line {
  y: number;
  parts: PdfItem[];
}

/** 跨行欄位（換行的店名/備註）歸戶到主列的最大 y 距離 */
const FLOAT_ATTACH_MAX_DY = 12;

const BANK_MONEY_RE = /^\$-?[\d,]+(?:\.\d+)?$/;
const CARD_MONEY_RE = /^-?[\d,]+(?:\.\d+)?$/;
const AD_DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;
const ROC_DATE_RE = /^\d{3}\/\d{2}\/\d{2}$/;
const ACCOUNT_RE = /^[\d*]{10,}$/;

function toAmount(text: string): number {
  return Number(text.replace(/[$,]/g, ""));
}

function rocToIso(roc: string): string {
  const [y, m, d] = roc.split("/");
  return `${Number(y) + 1911}-${m}-${d}`;
}

/** 依 y 座標把片段組成視覺行（由上而下），行內依 x 排序 */
function buildLines(page: PdfItem[]): Line[] {
  const byY = new Map<number, PdfItem[]>();
  for (const it of page) {
    if (it.text.trim() === "") continue;
    const key = Math.round(it.y / 2) * 2;
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key)!.push(it);
  }
  return [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([y, parts]) => ({ y, parts: parts.sort((a, b) => a.x - b.x) }));
}

function lineText(line: Line): string {
  return line.parts.map((p) => p.text).join(" ");
}

function normalized(line: Line): string {
  return lineText(line).replace(/\s/g, "");
}

function allText(pages: PdfItem[][]): string {
  return pages
    .flat()
    .map((it) => it.text)
    .join("\n");
}

/** 把游離行（非主列）依最近 y 距離歸戶到主列 */
function attachFloats(
  lines: Line[],
  mainRowYs: number[],
  isExcluded: (line: Line) => boolean,
  isMainRow: (line: Line) => boolean,
): Map<number, Line[]> {
  const attached = new Map<number, Line[]>();
  for (const line of lines) {
    if (isMainRow(line) || isExcluded(line)) continue;
    let best = -1;
    let bestDy = Number.POSITIVE_INFINITY;
    for (let i = 0; i < mainRowYs.length; i++) {
      const dy = Math.abs(line.y - mainRowYs[i]);
      if (dy < bestDy) {
        bestDy = dy;
        best = i;
      }
    }
    if (best >= 0 && bestDy <= FLOAT_ATTACH_MAX_DY) {
      if (!attached.has(best)) attached.set(best, []);
      attached.get(best)!.push(line);
    }
  }
  return attached;
}

// ===== 綜合對帳單（銀行帳戶） =====

export interface BankTransaction {
  account: string;
  /** YYYY-MM-DD */
  date: string;
  description: string;
  withdrawal: number | null;
  deposit: number | null;
  balance: number;
  note: string;
}

export interface BankStatement {
  /** YYYY-MM */
  month: string;
  /** Richart 總資產（目前存款） */
  totalBalance: number;
  transactions: BankTransaction[];
}

const BANK_FLOAT_EXCLUDE = [
  "支出金額",
  "存入金額",
  "帳戶餘額",
  "合計",
  "帳號類別",
  "註：",
  "您在本行",
  "新臺幣帳戶",
  "各產品訊息",
];

/** 把「$金額 後接文字」的片段拆成金額與備註兩段（寬度依字元比例分配），並修剪前後空白 */
function splitMergedMoney(parts: PdfItem[]): PdfItem[] {
  const out: PdfItem[] = [];
  for (const p of parts) {
    const text = p.text.trim();
    const m = text.match(/^(\$-?[\d,]+(?:\.\d+)?)\s+(.+)$/);
    if (m) {
      const ratio = m[1].length / text.length;
      out.push({ text: m[1], x: p.x, y: p.y, width: p.width * ratio });
      out.push({
        text: m[2],
        x: p.x + p.width * ratio,
        y: p.y,
        width: p.width * (1 - ratio),
      });
    } else {
      out.push({ ...p, text });
    }
  }
  return out;
}

function isBankMainRow(line: Line): boolean {
  return (
    line.parts.length >= 2 &&
    ACCOUNT_RE.test(line.parts[0].text) &&
    AD_DATE_RE.test(line.parts[1].text)
  );
}

export function parseBankStatement(pages: PdfItem[][]): BankStatement {
  const period = allText(pages).match(/資料期間：(\d{4})\/(\d{2})/);
  const month = period ? `${period[1]}-${period[2]}` : "";

  let totalBalance = 0;
  const transactions: BankTransaction[] = [];

  for (const page of pages) {
    const lines = buildLines(page);

    // Richart 總資產（同一行的金額）
    for (const line of lines) {
      if (normalized(line).includes("Richart總資產")) {
        const moneyPart = line.parts.find((p) => BANK_MONEY_RE.test(p.text));
        if (moneyPart) totalBalance = toAmount(moneyPart.text);
      }
    }

    // 支出/存入欄位中心 x（表頭可能每頁重複，取最近一次）
    let withdrawalX: number | null = null;
    let depositX: number | null = null;
    for (const line of lines) {
      const w = line.parts.find((p) => p.text.replace(/\s/g, "") === "支出金額");
      const d = line.parts.find((p) => p.text.replace(/\s/g, "") === "存入金額");
      if (w && d) {
        withdrawalX = w.x + w.width / 2;
        depositX = d.x + d.width / 2;
      }
    }
    if (withdrawalX === null || depositX === null) {
      // 此頁沒有明細表頭 → 沒有交易列
      continue;
    }
    const midpoint = (withdrawalX + depositX) / 2;

    const mainLines = lines.filter(isBankMainRow);
    const pageTransactions: BankTransaction[] = [];
    for (const rawLine of mainLines) {
      // 餘額與備註可能黏在同一片段（"$180,221 台電電費…"），先拆開
      const line: Line = { y: rawLine.y, parts: splitMergedMoney(rawLine.parts) };
      const moneyIdx = line.parts
        .map((p, i) => (BANK_MONEY_RE.test(p.text) ? i : -1))
        .filter((i) => i >= 0);
      if (moneyIdx.length === 0) continue;
      const balanceIdx = moneyIdx[moneyIdx.length - 1];
      const balance = toAmount(line.parts[balanceIdx].text);
      let withdrawal: number | null = null;
      let deposit: number | null = null;
      for (const i of moneyIdx.slice(0, -1)) {
        const part = line.parts[i];
        const center = part.x + part.width / 2;
        if (center <= midpoint) {
          withdrawal = toAmount(part.text);
        } else {
          deposit = toAmount(part.text);
        }
      }
      const description = line.parts
        .slice(2, moneyIdx[0])
        .map((p) => p.text)
        .join("")
        .trim();
      const note = line.parts
        .slice(balanceIdx + 1)
        .map((p) => p.text)
        .join(" ")
        .trim();
      pageTransactions.push({
        account: line.parts[0].text,
        date: line.parts[1].text.replaceAll("/", "-"),
        description,
        withdrawal,
        deposit,
        balance,
        note,
      });
    }

    const floats = attachFloats(
      lines,
      mainLines.map((l) => l.y),
      (line) => {
        const text = normalized(line);
        return BANK_FLOAT_EXCLUDE.some((kw) => text.includes(kw));
      },
      isBankMainRow,
    );
    for (const [rowIndex, floatLines] of floats) {
      const extra = floatLines.map(lineText).join(" ").trim();
      const tx = pageTransactions[rowIndex];
      if (tx && extra) {
        tx.note = [tx.note, extra].filter(Boolean).join(" ");
      }
    }
    transactions.push(...pageTransactions);
  }

  return { month, totalBalance, transactions };
}

// ===== 信用卡電子帳單 =====

export interface CardTransaction {
  /** 消費日 YYYY-MM-DD */
  purchaseDate: string;
  /** 入帳起息日 YYYY-MM-DD */
  postDate: string;
  description: string;
  /** 新臺幣金額，負數為繳款/退款 */
  amount: number;
  cardLast4: string;
  note: string;
}

export interface CardStatement {
  /** 帳單月份 YYYY-MM */
  month: string;
  /** 本期新增款項 */
  newCharges: number;
  /** 本期累計應繳金額 */
  totalDue: number;
  transactions: CardTransaction[];
}

const CARD_FLOAT_EXCLUDE = [
  "消費日",
  "入帳起息日",
  "卡號末四碼",
  "下列消費明細",
  "■",
];

function isCardMainRow(line: Line): boolean {
  return (
    line.parts.length >= 3 &&
    ROC_DATE_RE.test(line.parts[0].text) &&
    ROC_DATE_RE.test(line.parts[1].text)
  );
}

function summaryAmount(lines: Line[], keyword: string): number {
  for (const line of lines) {
    if (!normalized(line).includes(keyword)) continue;
    const moneyPart = line.parts.find(
      (p) => CARD_MONEY_RE.test(p.text) && /\d/.test(p.text),
    );
    if (moneyPart) return toAmount(moneyPart.text);
  }
  return 0;
}

export function parseCardStatement(pages: PdfItem[][]): CardStatement {
  const monthMatch = allText(pages).match(/(\d{3})年\s*(\d{2})\s*月/);
  const month = monthMatch
    ? `${Number(monthMatch[1]) + 1911}-${monthMatch[2]}`
    : "";

  let newCharges = 0;
  let totalDue = 0;
  const transactions: CardTransaction[] = [];
  let currentCard = "";

  for (const page of pages) {
    const lines = buildLines(page);
    newCharges = summaryAmount(lines, "本期新增款項") || newCharges;
    totalDue = summaryAmount(lines, "本期累計應繳金額") || totalDue;

    const mainLines: Line[] = [];
    const cardByRow: string[] = [];
    for (const line of lines) {
      const cardMatch = normalized(line).match(/卡號末四碼[:：](\d{4})/);
      if (cardMatch) {
        currentCard = cardMatch[1];
        continue;
      }
      if (isCardMainRow(line)) {
        mainLines.push(line);
        cardByRow.push(currentCard);
      }
    }

    const pageTransactions: CardTransaction[] = [];
    for (let i = 0; i < mainLines.length; i++) {
      const line = mainLines[i];
      const rest = line.parts.slice(2);
      const amountIdx = rest.findIndex((p) => CARD_MONEY_RE.test(p.text));
      if (amountIdx < 0) continue;
      const description = rest
        .slice(0, amountIdx)
        .map((p) => p.text)
        .join("")
        .trim();
      const note = rest
        .slice(amountIdx + 1)
        .map((p) => p.text)
        .join(" ")
        .trim();
      pageTransactions.push({
        purchaseDate: rocToIso(line.parts[0].text),
        postDate: rocToIso(line.parts[1].text),
        description,
        amount: toAmount(rest[amountIdx].text),
        cardLast4: cardByRow[i],
        note,
      });
    }

    const floats = attachFloats(
      lines,
      mainLines.map((l) => l.y),
      (line) => {
        const text = normalized(line);
        return CARD_FLOAT_EXCLUDE.some((kw) => text.includes(kw));
      },
      isCardMainRow,
    );
    for (const [rowIndex, floatLines] of floats) {
      const extra = floatLines.map(lineText).join(" ").trim();
      const tx = pageTransactions[rowIndex];
      if (tx && extra) {
        tx.description = [tx.description, extra].filter(Boolean).join(" ").trim();
      }
    }
    transactions.push(...pageTransactions);
  }

  return { month, newCharges, totalDue, transactions };
}

export function detectStatementType(
  pages: PdfItem[][],
): "bank" | "card" | null {
  const text = allText(pages).replace(/\s/g, "");
  if (text.includes("綜合對帳單")) return "bank";
  if (text.includes("信用卡電子帳單") || text.includes("信用卡帳單")) {
    return "card";
  }
  return null;
}
