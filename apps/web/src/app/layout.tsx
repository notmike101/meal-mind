import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChefHat, ListChecks, Settings, ShoppingBasket } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelloQwen",
  description: "Local AI meal planning with Markdown recipes.",
};

const navItems = [
  { href: "/", label: "Dashboard", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-ink/10 bg-[#fffdf8]">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-moss text-white">
                  <ChefHat size={22} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-tight">HelloQwen</span>
                  <span className="block text-sm text-ink/60">Local weekly meal planning</span>
                </span>
              </Link>
              <nav className="flex flex-wrap gap-2" aria-label="Primary navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink/75 hover:bg-ink/5 hover:text-ink"
                    >
                      <Icon size={16} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
