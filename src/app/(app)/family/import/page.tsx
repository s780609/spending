import { FamilyImportForm } from "@/app/family-import-form";

export default function FamilyImportPage() {
  return (
    <>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
          匯入台新帳單 PDF
        </h1>
        <p className="mt-1 max-w-[55ch] text-sm leading-7 text-gray-600 text-pretty">
          上傳台新銀行的綜合對帳單或信用卡電子帳單，系統會自動辨識種類並匯入「家庭」明細；重複匯入會自動去重。
        </p>
        <FamilyImportForm />
    </>
  );
}
