import Link from "next/link";
import { PomeloLogo } from "@/app/components/PomeloLogo";
import { SignOutButton } from "./SignOutButton";

type Props = {
  user: { email?: string; user_metadata?: { full_name?: string } };
  activePath: string;
  children: React.ReactNode;
};

export function AppShell({ user, activePath, children }: Props) {
  const displayName =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "you";

  return (
    <div className="flex h-screen bg-stone-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-orange-700 focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 flex-col bg-white border-r border-stone-200">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-stone-100">
          <PomeloLogo size={35} />
          <span className="font-display text-xl font-bold text-orange-700 leading-none">
            pomelo
          </span>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 p-3 pt-4">
          <Link
            href="/courses"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
              activePath === "/courses"
                ? "bg-[#FEF3EC] text-orange-700"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
            }`}
          >
            My Courses
          </Link>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-stone-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#FEF3EC] flex items-center justify-center shrink-0">
            <span className="font-[family-name:var(--font-data)] text-[11px] font-semibold text-orange-700 uppercase">
              {displayName[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-stone-700 font-medium truncate">{displayName}</p>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main" className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
