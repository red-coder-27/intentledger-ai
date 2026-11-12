import React from "react";
import Link from "next/link";

export function IntentLedgerLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer verification shield */}
      <path
        d="M16 3L5 7.5V15.5C5 22.5 9.7 28.9 16 30C22.3 28.9 27 22.5 27 15.5V7.5L16 3Z"
        stroke="#102A43"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#FFFFFF"
      />
      {/* Precision ledger horizontal hash bars */}
      <path
        d="M10 12H22"
        stroke="#1769AA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 16H22"
        stroke="#102A43"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 20H18"
        stroke="#1769AA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Integrity anchor node */}
      <circle cx="21" cy="20" r="1.5" fill="#16835D" />
    </svg>
  );
}

export function WordmarkLogo() {
  return (
    <Link href="/app" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
      <IntentLedgerLogo className="h-6 w-6 text-navy-deep" />
      <div className="flex flex-col">
        <span className="font-sans font-bold text-sm tracking-tight text-[#102A43] uppercase leading-none">
          INTENTLEDGER <span className="text-[#1769AA] font-semibold">AI</span>
        </span>
        <span className="text-[9px] tracking-wider font-mono text-[#64748B] uppercase leading-tight mt-0.5">
          Trust Infrastructure
        </span>
      </div>
    </Link>
  );
}

