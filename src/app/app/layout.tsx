"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  Bot,
  ShieldCheck,
  Receipt,
  FileCheck,
  Scale,
  BarChart3,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { WordmarkLogo } from "@/components/layout/logo";

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/intents", label: "Intent Studio", icon: ScrollText },
  { href: "/app/agent", label: "Shopping Agent", icon: Bot },
  { href: "/app/authorization", label: "Authorization Center", icon: ShieldCheck },
  { href: "/app/transactions", label: "Transactions", icon: Receipt },
  { href: "/app/passports", label: "Transaction Passports", icon: FileCheck },
  { href: "/app/evidence", label: "Evidence Center", icon: Scale },
  { href: "/app/analytics", label: "Intelligence & Analytics", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: SlidersHorizontal },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA]">
      {/* Left Navigation Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-[#E2E8F0] bg-[#FFFFFF]">
        {/* Brand Header */}
        <div className="h-14 px-5 flex items-center border-b border-[#E2E8F0]">
          <WordmarkLogo />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#EBF4FB] text-[#1769AA] font-semibold"
                    : "text-[#64748B] hover:text-[#102A43] hover:bg-[#F0F3F7]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isActive ? "text-[#1769AA]" : "text-[#64748B]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* System & Trust Footprint */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B] font-mono">Kernel Status</span>
              <span className="inline-flex items-center gap-1 text-[#16835D] font-mono font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16835D] animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B] font-mono">Algorithm</span>
              <span className="font-mono text-[#102A43] text-[10px]">Ed25519 / SHA256</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B] font-mono">Gateway</span>
              <span className="font-mono text-[#1769AA] text-[10px]">PayPal Sandbox</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Execution Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact Top Navigation Bar */}
        <header className="h-14 border-b border-[#E2E8F0] bg-[#FFFFFF] px-6 flex items-center justify-between flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="font-mono text-[#1769AA] font-semibold">INTENTLEDGER</span>
            <span>/</span>
            <span className="text-[#102A43] capitalize font-medium">
              {pathname === "/app" ? "Overview" : pathname.replace("/app/", "").split("/")[0].replace("-", " ")}
            </span>
          </div>

          {/* Sandbox Indicator & Quick Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[11px] font-mono text-[#B7791F]">
              <ShieldAlert className="h-3.5 w-3.5 text-[#B7791F]" />
              <span>PAYPAL SANDBOX MODE</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-[11px] font-mono text-[#16835D]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16835D]" />
              <span>18 POLICIES ENFORCED</span>
            </div>

            <Link
              href="https://developer.paypal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#64748B] hover:text-[#102A43] flex items-center gap-1 pl-2 border-l border-[#E2E8F0]"
            >
              <span className="font-mono text-[11px]">PayPal Docs</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F7FA]">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
