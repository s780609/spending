import { NextResponse, type NextRequest } from "next/server";
import { recordDailySnapshot } from "@/lib/balance-sheet";

export const dynamic = "force-dynamic";

/** Vercel Cron 每日呼叫，寫入當日淨資產快照 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sheet = await recordDailySnapshot();
  return NextResponse.json({
    ok: true,
    reliable: sheet.reliable,
    totalAssets: Math.round(sheet.totalAssets),
    totalLiabilities: Math.round(sheet.totalLiabilities),
    netWorth: Math.round(sheet.netWorth),
    leverage: sheet.leverage,
  });
}
