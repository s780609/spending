import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token || token !== (await authToken())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // api/snapshot 由 CRON_SECRET 自行驗證，供 Vercel Cron 呼叫
  matcher: ["/((?!login|api/snapshot|_next/static|_next/image|favicon.ico).*)"],
};
