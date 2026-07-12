import { login } from "@/app/actions";

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
        <p className="font-mono text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Spending
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
          記帳小工具
        </h1>
        <input
          type="password"
          name="password"
          placeholder="輸入密碼"
          required
          autoFocus
          className="mt-6 w-full rounded-lg bg-white dark:bg-gray-900 px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:text-sm"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600">密碼錯誤，請再試一次</p>
        )}
        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-gray-950 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900"
        >
          登入
        </button>
      </form>
    </main>
  );
}
