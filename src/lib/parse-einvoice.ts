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

  const lines = content.replace(/^﻿/, "").split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("表頭=") || line.startsWith("明細=")) {
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
