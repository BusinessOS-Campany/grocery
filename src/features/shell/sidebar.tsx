"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight, Store, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/shared/i18n";
import { NAV_GROUPS, navLabel } from "./nav-config";

interface Props {
  t: Dictionary;
  permissions: string[];
  storeName: string;
  logoUrl?: string | null;
  userName?: string;
}

function hasPerm(perms: string[], key?: string) {
  if (!key) return true;
  return perms.includes("*") || perms.includes(key);
}

export function Sidebar({ t, permissions, storeName, logoUrl, userName }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  const visible = NAV_GROUPS.map((g, gi) => {
    if (!hasPerm(permissions, g.permission)) return null;
    const items = g.items.filter((i) => hasPerm(permissions, i.permission));
    if (items.length === 0) return null;
    return { ...g, items, gi };
  }).filter(Boolean) as Array<NavGroupWithIndex>;

  const toggleGroup = (gi: number) =>
    setOpenGroups((s) => ({ ...s, [gi]: s[gi] === undefined ? false : !s[gi] }));

  const CollapseIcon = collapsed ? ChevronsLeft : ChevronsRight;

  return (
    <aside
      className={cn(
        "print:hidden",
        "sticky top-0 hidden h-screen shrink-0 flex-col border-e transition-[width] duration-300 md:flex",
        "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100",
        "shadow-2xl shadow-black/30",
        collapsed ? "w-[76px]" : "w-72",
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 px-2 shadow-sm overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" className="h-10 w-auto max-w-[160px] object-contain object-center" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Store className="size-5" />
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold tracking-tight">{storeName}</div>
            <div className="truncate text-[11px] text-slate-400">Grocery ERP</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {visible.map((group) => {
          const isOpen = openGroups[group.gi] !== false;
          return (
            <div key={group.gi} className="space-y-1">
              {group.labelKey && !collapsed && (
                <button
                  onClick={() => toggleGroup(group.gi)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {group.icon && <group.icon className="size-3.5" />}
                  <span className="flex-1 text-start">{navLabel(t.nav, t.reports, group.labelKey)}</span>
                  <ChevronDown className={cn("size-3.5 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                </button>
              )}
              {group.labelKey && collapsed && <div className="mx-2 my-2 border-t border-white/10" />}
              {(isOpen || collapsed) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.href.includes("?")
                      ? currentUrl === item.href
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? navLabel(t.nav, t.reports, item.labelKey) : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                            active
                              ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 shadow-sm shadow-emerald-500/10"
                              : "text-slate-300 hover:bg-white/5 hover:text-white",
                            collapsed && "justify-center px-0",
                          )}
                        >
                          {active && (
                            <span className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-emerald-400" />
                          )}
                          <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", active && "text-emerald-400")} />
                          {!collapsed && <span className="truncate">{navLabel(t.nav, t.reports, item.labelKey)}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer profile */}
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 rounded-xl bg-white/5 p-2", collapsed && "justify-center")}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
            {(userName ?? "A").charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{userName ?? "Administrator"}</div>
              <div className="truncate text-[11px] text-slate-400">Online</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="toggle sidebar"
        >
          <CollapseIcon className="size-4" />
          {!collapsed && <span className="text-xs">طي/توسيع</span>}
        </button>
      </div>
    </aside>
  );
}

type NavGroupWithIndex = (typeof NAV_GROUPS)[number] & { items: (typeof NAV_GROUPS)[number]["items"]; gi: number };