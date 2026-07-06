export interface InvoiceItem {
  name: string;
  amount: number;
}

export interface ParsedInvoice {
  carrierName: string;
  carrierNumber: string;
  /** YYYY-MM-DD */
  date: string;
  sellerTaxId: string;
  sellerName: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  items: InvoiceItem[];
}

export interface ParseResult {
  invoices: ParsedInvoice[];
  voidedCount: number;
  errors: string[];
}

/**
 * 解析財政部電子發票載具消費明細 CSV。
 * 格式：| 分隔，M 列為發票主檔、D 列為品項明細，行尾有結尾分隔符號。
 */
export function parseEInvoiceCsv(content: string): ParseResult {
  const invoices: ParsedInvoice[] = [];
  const byNumber = new Map<string, ParsedInvoice>();
  const voidedNumbers = new Set<string>();
  const errors: string[] = [];
  let voidedCount = 0;

  // 品項名稱可能內含換行（如停車場發票），完整的一筆會以 | 結尾；
  // 行尾沒有 | 表示尚未結束，把後續行併回同一筆
  const lines: string[] = [];
  for (const raw of content.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const prev = lines[lines.length - 1];
    if (
      prev !== undefined &&
      !prev.endsWith("|") &&
      !/^[MD]\|/.test(line) &&
      !line.startsWith("表頭=") &&
      !line.startsWith("明細=")
    ) {
      lines[lines.length - 1] = `${prev} ${line}`;
    } else {
      lines.push(line);
    }
  }

  for (const line of lines) {
    if (line.startsWith("表頭=") || line.startsWith("明細=")) {
      continue;
    }

    const fields = line.split("|");

    if (fields[0] === "M") {
      if (fields.length < 9) {
        errors.push(line);
        continue;
      }
      const status = fields[8];
      const invoiceNumber = fields[6];
      if (status.includes("作廢")) {
        voidedCount += 1;
        voidedNumbers.add(invoiceNumber);
        continue;
      }
      const dateRaw = fields[3];
      const invoice: ParsedInvoice = {
        carrierName: fields[1],
        carrierNumber: fields[2],
        date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
        sellerTaxId: fields[4],
        sellerName: fields[5],
        invoiceNumber,
        totalAmount: Number(fields[7]),
        status,
        items: [],
      };
      invoices.push(invoice);
      byNumber.set(invoiceNumber, invoice);
    } else if (fields[0] === "D") {
      if (fields.length < 4) {
        errors.push(line);
        continue;
      }
      const invoiceNumber = fields[1];
      if (voidedNumbers.has(invoiceNumber)) {
        continue;
      }
      const invoice = byNumber.get(invoiceNumber);
      if (!invoice) {
        errors.push(line);
        continue;
      }
      invoice.items.push({ name: fields[3], amount: Number(fields[2]) });
    } else {
      errors.push(line);
    }
  }

  return { invoices, voidedCount, errors };
}

/**
 * 解析財政部電子發票「雲端發票明細」下載 CSV（官網下載，逗號分隔）。
 * 與每月寄送的 | 分隔格式不同：含中文標題列，每一列同時帶發票主檔與一筆品項，
 * 同一發票號碼會有多列，整張發票金額為各品項金額加總（此格式無總額欄位）。
 * 欄位：載具自訂名稱,發票日期,發票號碼,發票金額,發票狀態,折讓,賣方統編,
 *       賣方名稱,賣方地址,買方統編,數量,單價,消費明細_金額,消費明細_品名
 */
export function parseEInvoiceDownloadCsv(content: string): ParseResult {
  const invoices: ParsedInvoice[] = [];
  const byNumber = new Map<string, ParsedInvoice>();
  const voidedNumbers = new Set<string>();
  const errors: string[] = [];
  let voidedCount = 0;

  for (const raw of content.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }

    const fields = line.split(",");
    const dateRaw = fields[1];
    // 標題列（發票日期非數字）與檔尾說明文字（欄位不足）一律略過，不計為錯誤
    if (fields.length < 14 || !/^\d{8}$/.test(dateRaw)) {
      continue;
    }

    const invoiceNumber = fields[2];
    const status = fields[4];
    // 品名為最後一欄，未加引號時內含的逗號會被切開，slice(13) 後再併回
    const itemName = fields.slice(13).join(",").trim();
    const itemAmount = Number(fields[12]);
    if (!invoiceNumber || Number.isNaN(itemAmount)) {
      errors.push(line);
      continue;
    }

    if (status.includes("作廢")) {
      if (!voidedNumbers.has(invoiceNumber)) {
        voidedNumbers.add(invoiceNumber);
        voidedCount += 1;
      }
      continue;
    }

    let invoice = byNumber.get(invoiceNumber);
    if (!invoice) {
      invoice = {
        carrierName: fields[0],
        carrierNumber: "", // 下載格式無載具號碼欄
        date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
        sellerTaxId: fields[6],
        sellerName: fields[7],
        invoiceNumber,
        totalAmount: 0,
        status,
        items: [],
      };
      invoices.push(invoice);
      byNumber.set(invoiceNumber, invoice);
    }
    invoice.items.push({ name: itemName, amount: itemAmount });
    invoice.totalAmount += itemAmount;
  }

  return { invoices, voidedCount, errors };
}

/**
 * 匯入 CSV 統一入口：自動辨識兩種電子發票格式後分派解析。
 * 官網下載格式為逗號分隔、首列是中文欄位標題；每月寄送格式為 | 分隔。
 */
export function parseInvoiceCsv(content: string): ParseResult {
  const firstLine =
    content
      .replace(/^﻿/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? "";
  const isDownloadFormat =
    firstLine.startsWith("載具自訂名稱") ||
    (firstLine.includes(",") && firstLine.includes("發票號碼"));

  return isDownloadFormat
    ? parseEInvoiceDownloadCsv(content)
    : parseEInvoiceCsv(content);
}
