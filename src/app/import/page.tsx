"use client";

import { useActionState } from "react";
import { importCsv, type ImportState } from "@/app/actions";
import { Nav } from "@/app/nav";

const initialState: ImportState = { message: "" };

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState(importCsv, initialState);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          匯入電子發票 CSV
        </h1>
        <p className="mt-1 max-w-[55ch] text-sm leading-7 text-gray-600 text-pretty">
          上傳財政部電子發票整合服務平台寄送的消費發票彙整檔（| 分隔、UTF-8
          編碼）。同一張發票重複匯入會自動略過，作廢發票不會匯入；匯入後預設為「未分類」，可回列表調整分類。
        </p>

        <form
          action={formAction}
          className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-950/10"
        >
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-gray-950/5 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-950 hover:file:bg-gray-950/10"
          />
          <button
            type="submit"
            disabled={isPending}
            className="mt-4 rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "匯入中…" : "開始匯入"}
          </button>
        </form>

        {state.message && (
          <div className="mt-4 rounded-xl bg-gray-950/[0.025] p-4 text-sm ring-1 ring-inset ring-gray-950/5">
            <p className="font-medium text-gray-950">{state.message}</p>
            {state.imported !== undefined && (
              <ul className="mt-1 leading-6 text-gray-600">
                <li>新增 {state.imported} 筆</li>
                <li>略過重複 {state.skipped} 筆</li>
                <li>作廢發票 {state.voided} 張</li>
                {state.parseErrors ? (
                  <li>無法解析 {state.parseErrors} 列</li>
                ) : null}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}
