import { login } from "@/app/actions";
import { PasswordInput } from "@/app/password-input";
import { SubmitButton } from "@/app/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form
        action={login}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-md ring-1 ring-gray-950/10 dark:ring-white/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 靜態 SVG 圖示，不需 next/image 最佳化 */}
        <img src="/icon.svg" alt="" width={56} height={56} className="rounded-2xl shadow-lg shadow-emerald-500/10" />
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Spending
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
          記帳小工具
        </h1>
        <PasswordInput />
        {error && (
          <p className="mt-2 text-sm text-red-600">密碼錯誤，請再試一次</p>
        )}
        <SubmitButton
          pendingLabel="登入中…"
          className="mt-6 w-full rounded-full bg-gray-950 dark:bg-emerald-400 px-4 py-2 text-sm font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-emerald-300 dark:hover:text-gray-950"
        >
          登入
        </SubmitButton>
      </form>
    </main>
  );
}
