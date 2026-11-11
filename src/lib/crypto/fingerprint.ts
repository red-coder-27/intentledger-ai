import { canonicalStringify } from "./canonical";
import { sha256 } from "./hash";

export interface ProposalFingerprintInput {
  mandateId: string;
  productId: string;
  merchantId: string;
  proposedAmount: string; // "85.00"
  currency: string;       // "USD"
  quantity: number;       // 1
}

/**
 * Computes deterministic SHA-256 fingerprint for a proposal.
 * Any modification to price, product, merchant, or quantity will change the fingerprint.
 */
export function computeProposalFingerprint(input: ProposalFingerprintInput): string {
  const normalized = {
    mandateId: input.mandateId.trim(),
    productId: input.productId.trim(),
    merchantId: input.merchantId.trim(),
    proposedAmount: Number(input.proposedAmount).toFixed(2),
    currency: input.currency.trim().toUpperCase(),
    quantity: Math.floor(input.quantity),
  };

  const canonical = canonicalStringify(normalized);
  return sha256(canonical);
}

/**
 * Verifies if an existing proposal fingerprint matches the incoming parameters.
 */
export function verifyProposalFingerprint(
  expectedFingerprint: string,
  input: ProposalFingerprintInput
): boolean {
  const actualFingerprint = computeProposalFingerprint(input);
  return expectedFingerprint.toLowerCase() === actualFingerprint.toLowerCase();
}
