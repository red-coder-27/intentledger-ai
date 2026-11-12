"use client";

import React, { useState, useEffect } from "react";
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function EvidenceCenterPage() {
  const [selectedTx, setSelectedTx] = useState("tx_sc1_valid_01");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const fetchEvidence = async (txId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/evidence/${txId}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence(selectedTx);
  }, [selectedTx]);

  const assessment = report?.assessment;
  const drift = report?.driftReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
          Evidence Center & Dispute Readiness
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Auditable transaction reconstruction. Assesses record completeness, validates intent drift, and produces grounded evidence dossiers for PayPal dispute defense.
        </p>
      </div>

      {/* Target Transaction Picker */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#102A43] whitespace-nowrap">
            Transaction Identifier:
          </label>
          <input
            type="text"
            value={selectedTx}
            onChange={(e) => setSelectedTx(e.target.value)}
            className="px-3 py-1.5 border border-[#CBD5E1] rounded text-xs font-mono text-[#102A43] focus:outline-none focus:border-[#1769AA] w-64"
          />
        </div>

        <button
          onClick={() => fetchEvidence(selectedTx)}
          disabled={loading}
          className="px-3 py-1.5 bg-[#1769AA] text-white rounded text-xs font-semibold hover:bg-[#12538A] transition-colors"
        >
          {loading ? "Reconstructing Evidence..." : "Assess Completeness"}
        </button>
      </div>

      {assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Evidence Inventory Checklist (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0F3F7] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#102A43]">
                    Evidence Inventory & Chain of Custody
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Audit checklist of required primary records
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#16835D]">
                    {assessment.completenessPercentage}% Complete
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      assessment.disputeReadinessScore === "DISPUTE_READY"
                        ? "bg-[#E8F5E9] text-[#16835D]"
                        : "bg-[#FEF3C7] text-[#B7791F]"
                    }`}
                  >
                    {assessment.disputeReadinessScore}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {assessment.evidenceItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 border border-[#E2E8F0] rounded bg-[#F8FAFC] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.status === "PRESENT" ? (
                          <CheckCircle2 className="h-4 w-4 text-[#16835D]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[#C2413B]" />
                        )}
                        <span className="text-xs font-semibold text-[#102A43]">
                          {item.name}
                        </span>
                      </div>

                      <span className="font-mono text-[10px] text-[#64748B]">
                        {item.category} • {item.sourceRecord}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#334155]">{item.details}</p>

                    {item.fingerprintOrId && (
                      <div className="font-mono text-[10px] text-[#1769AA] truncate">
                        Anchor: {item.fingerprintOrId}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Intent Drift & Dispute Dossier */}
          <div className="space-y-4">
            {/* Intent Drift Analysis */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                  Intent Drift Detection
                </h3>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    drift?.hasDrift ? "bg-[#FEE2E2] text-[#C2413B]" : "bg-[#E8F5E9] text-[#16835D]"
                  }`}
                >
                  {drift?.hasDrift ? `${drift.totalIncidents} INCIDENTS` : "ZERO DRIFT"}
                </span>
              </div>

              {!drift?.hasDrift ? (
                <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-xs text-[#16835D] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Exact Alignment Verified</span>
                  </div>
                  <p className="text-[11px]">
                    No variance detected between original customer mandate, agent proposal, human approval, and PayPal capture.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drift.incidents.map((inc: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#FFF5F5] border border-[#FECACA] rounded text-xs text-[#C2413B] space-y-1"
                    >
                      <span className="font-bold font-mono text-[11px] block">
                        {inc.type} ({inc.severity})
                      </span>
                      <p className="text-[11px] text-[#334155]">{inc.explanation}</p>
                      <div className="text-[10px] font-mono text-[#64748B]">
                        Source: {inc.sourceOfDrift}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grounded Dispute Rebuttal Statement */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                Grounded Dispute Defense Summary
              </h3>
              <p className="text-xs text-[#64748B]">
                Factual defense statement compiled exclusively from verified system evidence records:
              </p>

              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-xs text-[#334155] leading-relaxed italic">
                &ldquo;{assessment.executiveSummary}&rdquo;
              </div>

              <div className="p-2 bg-[#F0F3F7] rounded text-[11px] text-[#64748B] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 text-[#1769AA]" />
                <span>INTENTLEDGER provides cryptographic proof of intent; official dispute adjudication is conducted by PayPal.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

