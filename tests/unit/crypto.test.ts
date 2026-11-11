import { describe, it, expect } from "vitest";
import { canonicalStringify } from "@/lib/crypto/canonical";
import { sha256, calculateEventHash, GENESIS_PREVIOUS_HASH } from "@/lib/crypto/hash";
import { KeyManager } from "@/lib/crypto/keys";
import { computeProposalFingerprint, verifyProposalFingerprint } from "@/lib/crypto/fingerprint";

describe("Cryptographic Primitives Unit Tests", () => {
  it("produces identical canonical JSON strings regardless of key ordering", () => {
    const objA = { z: 1, a: "hello", m: [3, 2, 1], b: { y: 2, x: 1 } };
    const objB = { a: "hello", b: { x: 1, y: 2 }, m: [3, 2, 1], z: 1 };
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  it("calculates deterministic SHA-256 hash", () => {
    const hash = sha256("intentledger");
    expect(hash).toHaveLength(64);
    expect(sha256("intentledger")).toBe(hash);
  });

  it("calculates sequential hash chain correctly", () => {
    const event1 = canonicalStringify({ seq: 1, type: "MANDATE_CREATED" });
    const h1 = calculateEventHash(GENESIS_PREVIOUS_HASH, event1);

    const event2 = canonicalStringify({ seq: 2, type: "PROPOSAL_GENERATED" });
    const h2 = calculateEventHash(h1, event2);

    expect(h1).not.toBe(h2);
    expect(h2).toHaveLength(64);
  });

  it("signs and verifies canonical payloads using Ed25519", () => {
    const payload = { mandateId: "mandate_123", limit: "100.00", currency: "USD" };
    const signature = KeyManager.signCanonical(payload);
    expect(signature).toBeDefined();
    expect(signature.length).toBeGreaterThan(64);

    const isValid = KeyManager.verifyCanonical(payload, signature);
    expect(isValid).toBe(true);

    // Tampered payload must fail
    const tampered = { mandateId: "mandate_123", limit: "100.01", currency: "USD" };
    const isTamperedValid = KeyManager.verifyCanonical(tampered, signature);
    expect(isTamperedValid).toBe(false);
  });

  it("computes proposal fingerprint and detects tampering (Scenario 4)", () => {
    const proposal = {
      mandateId: "mandate_01",
      productId: "prod_audio_01",
      merchantId: "merch_demo_01",
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
    };

    const fingerprint = computeProposalFingerprint(proposal);
    expect(fingerprint).toHaveLength(64);
    expect(verifyProposalFingerprint(fingerprint, proposal)).toBe(true);

    // Scenario 4: Change price from $85.00 to $95.00
    const tamperedPrice = { ...proposal, proposedAmount: "95.00" };
    expect(verifyProposalFingerprint(fingerprint, tamperedPrice)).toBe(false);

    // Tamper merchant
    const tamperedMerchant = { ...proposal, merchantId: "merch_rogue_99" };
    expect(verifyProposalFingerprint(fingerprint, tamperedMerchant)).toBe(false);
  });
});
