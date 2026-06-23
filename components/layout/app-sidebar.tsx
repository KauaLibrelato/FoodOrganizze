"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  ClipboardList,
  CookingPot,
  HandCoins,
  Home,
  LogOut,
  Package,
  ShoppingBasket,
  Users,
  Wallet,
} from "lucide-react";
import { signOutAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Dia a dia",
    items: [
      { href: "/dashboard", label: "Balcão", icon: Home },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { href: "/producao", label: "Produção", icon: Package },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/gestao", label: "Gestão", icon: Wallet },
      { href: "/financeiro", label: "Financeiro", icon: HandCoins },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/ingredientes", label: "Insumos", icon: ShoppingBasket },
      { href: "/receitas", label: "Receitas e produtos", icon: CookingPot },
    ],
  },
  {
    label: "Preço",
    items: [{ href: "/calculadoras", label: "Calculadoras", icon: Calculator }],
  },
];

const mobileItems = [
  navGroups[0].items[0],
  navGroups[0].items[1],
  navGroups[0].items[2],
  navGroups[1].items[0],
  navGroups[2].items[0],
];

export function AppSidebar({ accountEmail }: { accountEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-cream-300 bg-cream-50 p-5 md:flex">
      <Link href="/dashboard" className="flex justify-center rounded-xl px-2 py-2">
        <BrandLogo className="w-28 justify-center" />
      </Link>
      <nav className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-cocoa-400">
              {group.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-cocoa-500 transition-colors hover:bg-blush-50 hover:text-brand-700",
                    pathname === item.href &&
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-cream-100 text-cocoa-500 transition-colors group-hover:bg-blush-100 group-hover:text-brand-700",
                      pathname === item.href &&
                        "bg-primary-foreground/15 text-primary-foreground group-hover:bg-primary-foreground/15 group-hover:text-primary-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 border-t border-cream-300 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-400">Conta</p>
        <p className="mt-1 truncate text-sm font-semibold text-cocoa-800">{accountEmail}</p>
        <form action={signOutAction} className="mt-3">
          <Button className="w-full justify-start" size="sm" type="submit" variant="outline">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-cream-300 bg-card/95 px-2 py-2 shadow-[0_-16px_35px_rgba(73,48,40,0.08)] backdrop-blur md:hidden">
      {mobileItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-cocoa-400 transition-colors",
            pathname === item.href && "bg-blush-50 text-brand-700",
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="max-w-full truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
