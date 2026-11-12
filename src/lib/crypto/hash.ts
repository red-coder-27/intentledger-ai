import crypto from "crypto";
import { canonicalStringify } from "./canonical";

/**
 * Computes standard SHA-256 hex digest of string or buffer.
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Computes the hash for an event in a hash chain:
 * H(n) = SHA256( H(n-1) || CanonicalEvent(n) )
 */
export function calculateEventHash(previousHash: string, canonicalPayload: string): string {
  const combined = previousHash + ":" + canonicalPayload;
  return sha256(combined);
}

/**
 * Genesis hash constant for the root of any transaction ledger.
 */
export const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Computes genesis hash for a transaction passport.
 */
export function createGenesisHash(transactionId: string, timestamp: string): string {
  return calculateEventHash(
    GENESIS_PREVIOUS_HASH,
    canonicalStringify({ transactionId, timestamp, type: "GENESIS" })
  );
}

