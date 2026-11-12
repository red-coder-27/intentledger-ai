"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  enableDevValidations,
  themeAlpine,
  RowSelectionOptions,
} from "ag-grid-community";
import {
  Receipt,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { PaymentRecord } from "@/types";

// Enable development diagnostics for AG Grid in non-production environments
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  enableDevValidations();
}

// Register AG Grid Community Modules before any grid instance is created
ModuleRegistry.registerModules([AllCommunityModule]);

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#64748B]">Loading Transaction Workspace...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // PayPal Sandbox callback parameters
  const callbackStatus = searchParams.get("status");
  const callbackToken = searchParams.get("token");
  const callbackPayerId = searchParams.get("PayerID") || searchParams.get("payerId");

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // In-line capture state from callback
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState<any>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/analytics/overview");
      const json = await res.json();
      if (json.success && json.data.recentActivity) {
        setPayments(json.data.recentActivity);
        if (json.data.recentActivity.length > 0) {
          // If a token was provided in callback, try to select that matching transaction
          if (callbackToken) {
            const matched = json.data.recentActivity.find(
              (p: PaymentRecord) => p.paypalOrderId === callbackToken
            );
            setSelectedPayment(matched || json.data.recentActivity[0]);
          } else {
            setSelectedPayment(json.data.recentActivity[0]);
          }
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
  }, [callbackToken]);

  // Find the local payment record associated with callback token
  const matchedCallbackPayment = useMemo(() => {
    if (!callbackToken) return null;
    return payments.find((p) => p.paypalOrderId === callbackToken) || null;
  }, [callbackToken, payments]);

  // Handle explicit capture action directly from callback recovery
  const handleCaptureFromCallback = async () => {
    if (!callbackToken) return;
    setCapturing(true);
    setCaptureError(null);

    try {
      // Find or resolve internal payment ID
      const paymentId = matchedCallbackPayment?.id;
      if (!paymentId) {
        throw new Error(`Could not find local payment record for PayPal Order ${callbackToken}`);
      }

      const res = await fetch("/api/v1/payments/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          paypalOrderId: callbackToken,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Capture execution failed");
      }

      setCaptureSuccess(json.data);
      await fetchTransactions();
    } catch (err: any) {
      setCaptureError(err.message || "Failed to capture PayPal order");
    } finally {
      setCapturing(false);
    }
  };

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
          const isCaptured = params.data?.status === "CAPTURED";
          if (!isCaptured) {
            return (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-[#F1F5F9] text-[#64748B]">
                NOT_CAPTURED
              </span>
            );
          }
          const isReconciled = params.value === "RECONCILED";
          return (
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-medium ${
                isReconciled ? "bg-[#E8F5E9] text-[#16835D]" : "bg-[#FEE2E2] text-[#C2413B]"
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

  const rowSelection = useMemo<RowSelectionOptions<PaymentRecord>>(
    () => ({
      mode: "singleRow",
      enableClickSelection: true,
    }),
    []
  );

  const paginationPageSizeSelector = useMemo(() => [10, 20, 50, 100], []);

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

      {/* PayPal Callback Recovery Banner */}
      {callbackToken && (
        <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg p-4 space-y-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#1769AA] text-white flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#102A43]">
                  PayPal Sandbox Checkout Callback Received
                </h3>
                <p className="text-xs text-[#64748B] font-mono mt-0.5">
                  Order Token: <strong className="text-[#102A43]">{callbackToken}</strong>
                  {callbackPayerId && (
                    <span> | Buyer PayerID: <strong className="text-[#102A43]">{callbackPayerId}</strong></span>
                  )}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#B7791F] rounded font-mono text-xs font-bold uppercase">
              {matchedCallbackPayment?.status === "CAPTURED" ? "CAPTURED" : "APPROVED (Ready for Capture)"}
            </span>
          </div>

          <p className="text-xs text-[#334155]">
            The buyer completed authorization in the PayPal Sandbox window. To guarantee deterministic non-repudiation, payment funds must be captured, reconciled with authorized mandate constraints, and sealed into a cryptographic Transaction Passport.
          </p>

          {captureError && (
            <div className="p-2.5 bg-[#FEE2E2] border border-[#FECACA] rounded text-xs text-[#C2413B] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{captureError}</span>
            </div>
          )}

          {captureSuccess && (
            <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-xs text-[#16835D] flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Capture Confirmed! Capture ID: <strong>{captureSuccess.paypalCaptureId}</strong>
                </span>
              </div>
              <Link
                href={`/app/passports/${captureSuccess.passportId}`}
                className="px-3 py-1 bg-[#16835D] text-white rounded font-semibold hover:bg-[#126B4B] transition-colors"
              >
                View Sealed Passport
              </Link>
            </div>
          )}

          {matchedCallbackPayment?.status !== "CAPTURED" && !captureSuccess && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleCaptureFromCallback}
                disabled={capturing}
                className="py-2 px-4 bg-[#16835D] hover:bg-[#126B4B] text-white rounded text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{capturing ? "Revalidating & Capturing..." : "Capture & Issue Passport"}</span>
              </button>

              <Link
                href={`/app/authorization?orderId=${callbackToken}`}
                className="py-2 px-3 border border-[#CBD5E1] rounded text-xs font-semibold text-[#102A43] hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <span>Inspect in Authorization Center</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#1769AA]" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* AG Grid Container - Styled via AG Grid Theming API without conflicting legacy CSS files */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-sm">
        <div className="w-full h-[400px]">
          <AgGridReact
            theme={themeAlpine}
            rowData={payments}
            columnDefs={columnDefs}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={paginationPageSizeSelector}
            rowSelection={rowSelection}
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
              <span
                className={`px-2.5 py-1 rounded font-mono text-xs font-bold ${
                  selectedPayment.status === "CAPTURED"
                    ? "bg-[#E8F5E9] text-[#16835D]"
                    : "bg-[#FEF3C7] text-[#B7791F]"
                }`}
              >
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
              <span
                className={`font-bold ${
                  selectedPayment.status === "CAPTURED"
                    ? selectedPayment.reconciliationStatus === "RECONCILED"
                      ? "text-[#16835D]"
                      : "text-[#C2413B]"
                    : "text-[#64748B]"
                }`}
              >
                {selectedPayment.status === "CAPTURED"
                  ? selectedPayment.reconciliationStatus || "RECONCILED"
                  : "NOT_CAPTURED"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
