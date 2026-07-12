"use client";

import { useActionState } from "react";
import { importFamilyPdf, type FamilyImportState } from "@/app/actions";

const initialState: FamilyImportState = { message: "" };

export function FamilyImportForm() {
  const [state, formAction, isPending] = useActionState(
    importFamilyPdf,
    initialState,
  );

  return (
    <section className="mt-6 rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
      <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">匯入台新帳單 PDF</h2>
      <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-gray-500">
        支援綜合對帳單與信用卡電子帳單，自動辨識種類；重複匯入會自動去重。密碼即銀行寄送通知中的開檔密碼，僅用於解析、不會儲存。
      </p>
      <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept=".pdf,application/pdf"
          required
          className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-gray-950/5 dark:file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-950 dark:file:text-gray-50 dark:text-gray-50 hover:file:bg-gray-950/10 dark:hover:file:bg-white/20 sm:flex-1"
        />
        <input
          type="password"
          name="password"
          placeholder="PDF 密碼"
          autoComplete="off"
          className="rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:w-40 sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gray-950 dark:bg-white px-4 py-2.5 text-base font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900 disabled:opacity-50 sm:py-2 sm:text-sm"
        >
          {isPending ? "匯入中…" : "匯入"}
        </button>
      </form>
      {state.message && (
        <div className="mt-3 rounded-xl bg-gray-950/[0.025] dark:bg-white/[0.025] p-3 text-sm ring-1 ring-inset ring-gray-950/5 dark:ring-white/5">
          <p className="font-medium text-gray-950 dark:text-gray-50">{state.message}</p>
          {state.inserted !== undefined && (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {state.kind === "bank" ? "帳戶明細" : "信用卡明細"} {state.month}
              ：新增 {state.inserted} 筆、略過重複 {state.skipped} 筆
            </p>
          )}
        </div>
      )}
    </section>
  );
}
