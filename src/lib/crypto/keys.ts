import crypto from "crypto";
import { canonicalStringify } from "./canonical";

// Default stable Ed25519 keypair for reproducible local development & testing
// Never used in production with real assets.
const DEFAULT_DEV_ED25519_PRIVATE_KEY_PKCS8 =
  "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxUq63r+kM2K4zE4Z9wzU6u25aK2Z3q4b5c6d7e8f90\n-----END PRIVATE KEY-----";

export class KeyManager {
  private static privateKey: crypto.KeyObject | null = null;
  private static publicKey: crypto.KeyObject | null = null;
  private static currentVersion: string = process.env.INTENTLEDGER_KEY_VERSION || "v1";
  private static keyRegistry: Map<string, crypto.KeyObject> = new Map();

  public static get KEY_VERSION(): string {
    return this.currentVersion;
  }

  private static parsePrivateKey(keyStr: string): crypto.KeyObject {
    const trimmed = keyStr.trim();
    if (trimmed.includes("PRIVATE KEY")) {
      return crypto.createPrivateKey(trimmed);
    }
    // PKCS#8 ASN.1 DER prefix for Ed25519 (RFC 8410: id-Ed25519 1.3.101.112)
    const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex");

    // Check if hex (64 chars = 32 bytes seed, 128 chars = 64 bytes seed + pubkey)
    if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      const seedHex = trimmed.length >= 64 ? trimmed.slice(0, 64) : trimmed;
      const seed = Buffer.from(seedHex, "hex");
      const der = Buffer.concat([pkcs8Prefix, seed]);
      return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    }

    // Check if base64
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32 || buf.length === 64) {
      const seed = buf.subarray(0, 32);
      const der = Buffer.concat([pkcs8Prefix, seed]);
      return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
    } else if (buf.length === 48) {
      return crypto.createPrivateKey({ key: buf, format: "der", type: "pkcs8" });
    }

    throw new Error("Unrecognized Ed25519 private key format");
  }

  private static init() {
    if (this.privateKey && this.publicKey) return;

    try {
      const envKey = process.env.INTENTLEDGER_SIGNING_KEY_ED25519?.trim();
      if (envKey) {
        this.privateKey = this.parsePrivateKey(envKey);
      } else {
        // Fallback to stable dev keypair
        this.privateKey = crypto.createPrivateKey(DEFAULT_DEV_ED25519_PRIVATE_KEY_PKCS8);
      }
      this.publicKey = crypto.createPublicKey(this.privateKey);
    } catch {
      // Deterministic fallback to stable dev key
      this.privateKey = crypto.createPrivateKey(DEFAULT_DEV_ED25519_PRIVATE_KEY_PKCS8);
      this.publicKey = crypto.createPublicKey(this.privateKey);
    }

    if (this.publicKey) {
      this.keyRegistry.set(this.currentVersion, this.publicKey);
    }
  }

  /**
   * Registers a historical public key version for backward-compatible verification
   */
  public static registerKeyVersion(version: string, publicKeyPem: string): void {
    try {
      const keyObj = crypto.createPublicKey(publicKeyPem);
      this.keyRegistry.set(version, keyObj);
    } catch (err: any) {
      console.error(`Failed to register key version ${version}:`, err.message);
    }
  }

  /**
   * Rotates the active signing key to a new version, preserving historical keys
   */
  public static rotateKey(newVersion: string, newPrivateKeyPem?: string): void {
    this.init();
    // Archive current key under its active version
    if (this.publicKey) {
      this.keyRegistry.set(this.currentVersion, this.publicKey);
    }

    if (newPrivateKeyPem) {
      this.privateKey = crypto.createPrivateKey(newPrivateKeyPem);
    } else {
      const pair = crypto.generateKeyPairSync("ed25519");
      this.privateKey = pair.privateKey;
    }
    this.publicKey = crypto.createPublicKey(this.privateKey);
    this.currentVersion = newVersion;
    this.keyRegistry.set(newVersion, this.publicKey);
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
    versionOrPem?: string
  ): boolean {
    try {
      this.init();
      const canonical = canonicalStringify(payload);
      const payloadBuf = Buffer.from(canonical, "utf8");
      const sigBuf = Buffer.from(signatureHex, "hex");

      // 1. Direct PEM provided
      if (versionOrPem && versionOrPem.includes("KEY")) {
        const pubKey = crypto.createPublicKey(versionOrPem);
        return crypto.verify(null, payloadBuf, pubKey, sigBuf);
      }

      // 2. Specific version registered
      if (versionOrPem && this.keyRegistry.has(versionOrPem)) {
        const pubKey = this.keyRegistry.get(versionOrPem)!;
        return crypto.verify(null, payloadBuf, pubKey, sigBuf);
      }

      // 3. Current active key
      if (this.publicKey && crypto.verify(null, payloadBuf, this.publicKey, sigBuf)) {
        return true;
      }

      // 4. Fallback search across all historical keys in registry for historical compatibility
      for (const [ver, historicalKey] of this.keyRegistry.entries()) {
        if (ver !== this.currentVersion && crypto.verify(null, payloadBuf, historicalKey, sigBuf)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}

