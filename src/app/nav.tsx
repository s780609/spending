import Link from "next/link";
import { logout } from "@/app/actions";

export function Nav() {
  return (
    <header className="bg-white ring-1 ring-gray-950/5">
      <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-wider text-gray-600">
          Spending
        </span>
        <Link
          href="/"
          className="text-sm font-medium text-gray-950 hover:text-gray-600"
        >
          記帳
        </Link>
        <Link
          href="/import"
          className="text-sm font-medium text-gray-950 hover:text-gray-600"
        >
          匯入 CSV
        </Link>
        <form action={logout} className="ml-auto">
          <button
            type="submit"
            className="text-sm text-gray-600 hover:text-gray-950"
          >
            登出
          </button>
        </form>
      </nav>
    </header>
  );
}
