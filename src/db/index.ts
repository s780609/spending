import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

let cached: Db | undefined;

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL 環境變數，請參考 .env.example 設定");
  }
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}

/** 延遲初始化，避免 build 階段沒有 DATABASE_URL 時直接失敗 */
export function getDb(): Db {
  cached ??= createDb();
  return cached;
}
