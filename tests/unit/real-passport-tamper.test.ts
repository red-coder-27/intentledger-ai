import { describe, it, expect, beforeAll } from "vitest";
import { store } from "@/server/repositories/store";
import { TransactionPassportService } from "@/server/services/passport/ledger";
import { TransactionPassportData } from "@/types";

describe("Live Neon Transaction Passport pass_tx_1794494620496 Tamper & Verification Audit", () => {
  beforeAll(async () => {
    await store.ensureInitialized();
  });

  it("1. Successfully loads real persisted passport pass_tx_1794494620496 from Neon", () => {
    const passport = store.getPassportById("pass_tx_1794494620496");
    expect(passport).toBeDefined();
    expect(passport?.id).toBe("pass_tx_1794494620496");
    expect(passport?.paypalOrderId).toBe("8JJ990584K259862H");
    expect(passport?.paypalCaptureId).toBe("099980883C949623D");
    expect(passport?.events.length).toBe(9);
    expect(passport?.verificationStatus).toBe("VERIFIED");
  });

  it("2. Independently validates hash chain continuity and Ed25519 signatures on real passport", () => {
    const passport = store.getPassportById("pass_tx_1794494620496")!;
    const report = TransactionPassportService.verifyPassport(passport);
    expect(report.verificationStatus).toBe("VERIFIED");
    expect(report.chainValid).toBe(true);
    expect(report.signatureValid).toBe(true);
    expect(report.reconciliationValid).toBe(true);
    expect(report.totalEvents).toBe(9);
  });

  it("3. Detects payload mutation in Sequence 4 (HUMAN_APPROVED) and rejects passport as INVALID", () => {
    const passport = store.getPassportById("pass_tx_1794494620496")!;
    const tampered: TransactionPassportData = JSON.parse(JSON.stringify(passport));

    // Tamper sequence 4 canonical payload
    const event = tampered.events.find((e) => e.sequenceNumber === 4)!;
    event.canonicalPayload = event.canonicalPayload.replace("85.00", "99.99");

    const report = TransactionPassportService.verifyPassport(tampered);
    expect(report.verificationStatus).toBe("INVALID");
    expect(report.chainValid).toBe(false);
    expect(report.brokenAtSequence).toBe(4);
    expect(report.errorDetail).toContain("Payload mutation detected at sequence 4");
  });

  it("4. Detects hash tampering in Sequence 6 (ORDER_CREATED) and flags broken chain", () => {
    const passport = store.getPassportById("pass_tx_1794494620496")!;
    const tampered: TransactionPassportData = JSON.parse(JSON.stringify(passport));

    // Tamper currentHash of sequence 6
    const event = tampered.events.find((e) => e.sequenceNumber === 6)!;
    event.currentHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const report = TransactionPassportService.verifyPassport(tampered);
    expect(report.verificationStatus).toBe("INVALID");
    expect(report.chainValid).toBe(false);
    expect(report.brokenAtSequence).toBe(6);
  });
});

