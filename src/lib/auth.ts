export const AUTH_COOKIE = "spending_auth";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** 登入成功後寫入 cookie 的 token；改密碼或 secret 會讓所有舊 session 失效 */
export async function authToken(): Promise<string> {
  return sha256Hex(`${process.env.APP_PASSWORD}:${process.env.AUTH_SECRET}`);
}
