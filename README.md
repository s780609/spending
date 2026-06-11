# 記帳小工具（Spending）

簡單的個人記帳網站：手動記支出、每月匯入財政部電子發票 CSV、按月檢視與分類統計。

## 技術棧

- Next.js (App Router) + TypeScript + Tailwind CSS
- Neon (Serverless PostgreSQL) + Drizzle ORM
- Vitest（CSV 解析器單元測試）
- 部署：Vercel

## 功能

- 密碼登入保護（單一密碼，環境變數設定）
- 按月檢視支出列表、月總額、分類統計與過濾、圓餅圖／趨勢圖
- 手動新增支出（日期 / 店家 / 金額 / 分類）、刪除、調整分類
- 匯入電子發票 CSV（`|` 分隔、UTF-8）：
  - 一張發票一筆支出，品項明細可展開
  - 以發票號碼去重，重複匯入自動略過；作廢發票自動跳過
  - 依店名＋品項關鍵字自動分類（`src/lib/auto-category.ts`）
- 定期支出（房租等）：開站自動補帳，可設到期期限
- 資產負債表（`/assets`）：
  - 台股／美股持股（依券商戶頭），Yahoo Finance 自動抓價與美金匯率
  - 貸款（質押逐日計息、信貸本息平均攤還）
  - 淨資產與槓桿比率，每日快照走勢圖（Vercel Cron + 開頁補記）

## 本機開發

```bash
npm install
cp .env.example .env   # 填入 DATABASE_URL、APP_PASSWORD、AUTH_SECRET
npm run db:push        # 建立資料表（首次或 schema 變更後）
npm run dev
```

執行測試：

```bash
npm run test
```

## 建立 Neon 資料庫

1. 到 <https://neon.tech> 註冊並建立專案（區域選 Singapore 較近）。
2. 在專案頁面點 **Connect**，複製 Connection string。
3. 貼到 `.env` 的 `DATABASE_URL`。
4. 執行 `npm run db:push` 建立 `expenses`、`expense_items` 資料表。

## 部署到 Vercel

1. 推送程式碼到 GitHub。
2. 到 <https://vercel.com> → **Add New Project** → 匯入此 repo（框架會自動偵測為 Next.js）。
3. 在 **Environment Variables** 設定：
   - `DATABASE_URL`：Neon 連線字串
   - `APP_PASSWORD`：登入密碼
   - `AUTH_SECRET`：隨機長字串
   - `CRON_SECRET`：隨機長字串（Vercel Cron 呼叫 `/api/snapshot` 的驗證用）
4. Deploy。每日淨資產快照排程在 `vercel.json`（15:00 UTC＝台北 23:00）。

> 也可以在 Vercel 的 Storage 分頁直接整合 Neon，會自動注入 `DATABASE_URL`。

## CSV 格式

財政部電子發票整合服務平台每月寄送的消費發票彙整檔：

```
M|載具名稱|載具號碼|發票日期|商店統編|商店店名|發票號碼|總金額|發票狀態|
D|發票號碼|小計|品項名稱|
```

- `M` 列為發票主檔、`D` 列為品項明細，以發票號碼關聯
- 日期為西元 `YYYYMMDD`
- 小計可為負數（折抵）
