"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const LINKS = [
  { href: "/", label: "總覽", icon: DashboardIcon },
  { href: "/expenses", label: "記帳", icon: ListIcon },
  { href: "/family", label: "家庭", icon: HomeIcon },
  { href: "/assets", label: "資產", icon: TrendIcon },
  { href: "/motorcycle", label: "機車", icon: ScooterIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* 頂列：手機只留標誌＋登出，桌面含完整連結 */}
      <header className="bg-white ring-1 ring-gray-950/5">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
          <span className="font-mono text-xs uppercase tracking-wider text-gray-600">
            Spending
          </span>
          <div className="hidden items-center gap-6 sm:flex">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 text-sm ${
                    active
                      ? "font-semibold text-gray-950"
                      : "font-medium text-gray-600 hover:text-gray-950"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.8} />
                  {link.label}
                </Link>
              );
            })}
          </div>
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

      {/* 手機底部分頁列 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] ring-1 ring-gray-950/10 sm:hidden">
        <div className="flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
                  active ? "text-gray-950" : "text-gray-400"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span
                  className={`text-[10px] ${active ? "font-semibold" : ""}`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function iconProps({ className, strokeWidth = 2 }: IconProps) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
}

function DashboardIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

function TrendIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} aria-hidden>
      <path d="M22 7l-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

function ScooterIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} aria-hidden>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M9 17h6l1.5-7H19" />
      <path d="M16.5 10 14 5h-3" />
    </svg>
  );
}
