import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PdfItem } from "./parse-taishin";

/** 解開（可能加密的）PDF 並取出帶座標的文字片段；密碼錯誤丟出 PasswordException */
export async function extractPdfItems(
  data: Uint8Array,
  password?: string,
): Promise<PdfItem[][]> {
  const doc = await getDocument({ data, password }).promise;
  const pages: PdfItem[][] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const it of content.items) {
      if ("str" in it) {
        items.push({
          text: it.str,
          x: it.transform[4],
          y: it.transform[5],
          width: it.width,
        });
      }
    }
    pages.push(items);
  }
  return pages;
}
