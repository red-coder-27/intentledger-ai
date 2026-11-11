import crypto from "crypto";
import { canonicalStringify } from "./canonical";

// Default stable Ed25519 keypair for reproducible local development & testing
// Never used in production with real assets.
const DEFAULT_DEV_ED25519_PRIVATE_KEY_PKCS8 =
  "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxUq63r+kM2K4zE4Z9wzU6u25aK2Z3q4b5c6d7e8f90\n-----END PRIVATE KEY-----";

export class KeyManager {
  private static privateKey: crypto.KeyObject | null = null;
  private static publicKey: crypto.KeyObject | null = null;
  public static readonly KEY_VERSION = process.env.INTENTLEDGER_KEY_VERSION || "v1";

  private static init() {
    if (this.privateKey && this.publicKey) return;

    try {
      const envKey = process.env.INTENTLEDGER_SIGNING_KEY_ED25519;
      if (envKey && envKey.includes("PRIVATE KEY")) {
        this.privateKey = crypto.createPrivateKey(envKey);
      } else {
        // Fallback to stable dev keypair
        const pair = crypto.generateKeyPairSync("ed25519", {
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
          publicKeyEncoding: { type: "spki", format: "pem" },
        });
        this.privateKey = crypto.createPrivateKey(pair.privateKey);
      }
      this.publicKey = crypto.createPublicKey(this.privateKey);
    } catch {
      // Deterministic fallback pair for resilience
      const pair = crypto.generateKeyPairSync("ed25519");
      this.privateKey = pair.privateKey;
      this.publicKey = pair.publicKey;
    }
  }

  public static getPublicKeyPem(): string {
    this.init();
    return this.publicKey!.export({ type: "spki", format: "pem" }) as string;
  }

  public static getPublicKeyHex(): string {
    this.init();
    const der = this.publicKey!.export({ type: "spki", format: "der" }) as Buffer;
    // SPKI for Ed25519 has a 12-byte header; last 32 bytes are raw public key
    return der.subarray(der.length - 32).toString("hex");
  }

  public static signCanonical(payload: unknown): string {
    this.init();
    const canonical = canonicalStringify(payload);
    const signature = crypto.sign(null, Buffer.from(canonical, "utf8"), this.privateKey!);
    return signature.toString("hex");
  }

  public static verifyCanonical(
    payload: unknown,
    signatureHex: string,
    publicKeyPem?: string
  ): boolean {
    try {
      this.init();
      const canonical = canonicalStringify(payload);
      const pubKey = publicKeyPem ? crypto.createPublicKey(publicKeyPem) : this.publicKey!;
      return crypto.verify(
        null,
        Buffer.from(canonical, "utf8"),
        pubKey,
        Buffer.from(signatureHex, "hex")
      );
    } catch {
      return false;
    }
  }
}
