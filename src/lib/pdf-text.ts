import type { PdfItem } from "./parse-taishin";

/** 解開（可能加密的）PDF 並取出帶座標的文字片段；密碼錯誤丟出 PasswordException */
export async function extractPdfItems(
  data: Uint8Array,
  password?: string,
): Promise<PdfItem[][]> {
  // Next 的 server 執行環境沒有 DOMMatrix 等瀏覽器全域；pdfjs 在此偵測不到 Node、
  // 會跳過自身的 @napi-rs/canvas polyfill，導致載入時模組頂層的 `new DOMMatrix()`
  // 直接拋 ReferenceError。改由我們在 import pdfjs 前主動補上全域。
  if (!globalThis.DOMMatrix) {
    const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
    Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
  }
  // pdfjs 較重且依賴新版 Node API，動態載入避免拖垮其他頁面的模組初始化
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
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
