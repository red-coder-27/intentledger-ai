"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import {
  Receipt,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { PaymentRecord } from "@/types";

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function TransactionsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/analytics/overview");
      const json = await res.json();
      if (json.success && json.data.recentActivity) {
        setPayments(json.data.recentActivity);
        if (json.data.recentActivity.length > 0) {
          setSelectedPayment(json.data.recentActivity[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const columnDefs = useMemo<ColDef<PaymentRecord>[]>(
    () => [
      {
        field: "id",
        headerName: "Payment ID",
        width: 140,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-[#1769AA] font-medium">{params.value}</span>
        ),
      },
      {
        field: "createdAt",
        headerName: "Date / Time (UTC)",
        width: 170,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs text-[#64748B]">
            {params.value ? new Date(params.value).toISOString().replace("T", " ").slice(0, 19) : "N/A"}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "Authorized Product",
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: any) => (
          <span className="font-semibold text-xs text-[#102A43]">{params.value}</span>
        ),
      },
      {
        field: "merchantName",
        headerName: "Merchant",
        width: 160,
        cellRenderer: (params: any) => (
          <span className="text-xs text-[#334155]">{params.value}</span>
        ),
      },
      {
        field: "amount",
        headerName: "Amount (USD)",
        width: 130,
        cellRenderer: (params: any) => (
          <span className="font-mono text-xs font-bold text-[#102A43] tabular-nums">
            ${Number(params.value).toFixed(2)}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Payment Status",
        width: 140,
        cellRenderer: (params: any) => {
          const isCaptured = params.value === "CAPTURED";
          const isFailed = params.value === "FAILED" || params.value === "DENIED";
          return (
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                isCaptured
                  ? "bg-[#E8F5E9] text-[#16835D]"
                  : isFailed
                  ? "bg-[#FEE2E2] text-[#C2413B]"
                  : "bg-[#FEF3C7] text-[#B7791F]"
              }`}
            >
              {params.value}
            </span>
          );
        },
      },
      {
        field: "reconciliationStatus",
        headerName: "Reconciliation",
        width: 140,
        cellRenderer: (params: any) => {
          const isReconciled = params.value === "RECONCILED";
          return (
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-medium ${
                isReconciled ? "bg-[#E8F5E9] text-[#16835D]" : "bg-[#FEF3C7] text-[#B7791F]"
              }`}
            >
              {params.value || "PENDING"}
            </span>
          );
        },
      },
      {
        field: "paypalOrderId",
        headerName: "PayPal Order ID",
        width: 170,
        cellRenderer: (params: any) => (
          <span className="font-mono text-[11px] text-[#334155]">{params.value}</span>
        ),
      },
      {
        headerName: "Passport",
        width: 120,
        cellRenderer: (params: any) => {
          return (
            <Link
              href={`/app/passports`}
              className="text-xs text-[#1769AA] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Inspect</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
            Operational Transaction Workspace
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            AG Grid enterprise operational ledger displaying verified PayPal Developer Sandbox order records and cryptographic reconciliation states.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter transactions..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded text-xs bg-white text-[#102A43] focus:outline-none focus:border-[#1769AA] w-64"
            />
          </div>

          <button
            onClick={fetchTransactions}
            className="p-1.5 border border-[#CBD5E1] rounded bg-white hover:bg-[#F0F3F7] transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 text-[#102A43] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-sm">
        <div className="ag-theme-alpine w-full h-[400px]">
          <AgGridReact
            rowData={payments}
            columnDefs={columnDefs}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            rowSelection="single"
            onRowClicked={(event) => setSelectedPayment(event.data || null)}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
          />
        </div>
      </div>

      {/* Selected Transaction Drill-down Detail Panel */}
      {selectedPayment && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0F3F7] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#1769AA] font-bold">
                Transaction Reconciliation Detail
              </span>
              <h2 className="text-sm font-bold text-[#102A43] mt-0.5">
                {selectedPayment.productName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#16835D] rounded font-mono text-xs font-bold">
                {selectedPayment.status}
              </span>
              <Link
                href="/app/passports"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1769AA] text-white rounded text-xs font-semibold hover:bg-[#12538A] transition-colors"
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>View Transaction Passport</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
              <span className="text-[#64748B] block text-[11px]">Internal Payment ID</span>
              <span className="font-bold text-[#102A43]">{selectedPayment.id}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
              <span className="text-[#64748B] block text-[11px]">PayPal Sandbox Order ID</span>
              <span className="font-bold text-[#1769AA]">{selectedPayment.paypalOrderId}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
              <span className="text-[#64748B] block text-[11px]">Payee Email (Seller)</span>
              <span className="font-bold text-[#102A43]">{selectedPayment.paypalPayeeEmail}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
              <span className="text-[#64748B] block text-[11px]">Reconciliation Outcome</span>
              <span className="font-bold text-[#16835D]">
                {selectedPayment.reconciliationStatus || "RECONCILED"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
