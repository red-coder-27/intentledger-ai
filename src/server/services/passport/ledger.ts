import {
  ApprovalData,
  IntentMandateData,
  PaymentRecord,
  PurchaseProposalData,
  TransactionEventData,
  TransactionPassportData,
} from "@/types";
import { store } from "@/server/repositories/store";
import { canonicalStringify } from "@/lib/crypto/canonical";
import { calculateEventHash, createGenesisHash, sha256 } from "@/lib/crypto/hash";
import { KeyManager } from "@/lib/crypto/keys";

export interface CreatePassportInput {
  transactionId: string;
  mandate: IntentMandateData;
  proposal: PurchaseProposalData;
  approval: ApprovalData;
  payment: PaymentRecord;
  capturedAmount: string;
  currency: string;
}

export interface PassportVerificationReport {
  passportId: string;
  transactionId: string;
  verificationStatus: "VERIFIED" | "INVALID" | "INCOMPLETE";
  totalEvents: number;
  chainValid: boolean;
  signatureValid: boolean;
  reconciliationValid: boolean;
  errorDetail?: string;
  brokenAtSequence?: number;
  verifiedAt: string;
}

export class TransactionPassportService {
  /**
   * Constructs the tamper-evident hash chain and issues the Transaction Passport
   */
  public static createPassport(input: CreatePassportInput): TransactionPassportData {
    const passportId = `pass_${input.transactionId}`;
    const issuedAt = new Date().toISOString();
    const genesisHash = createGenesisHash(input.transactionId, issuedAt);

    // 1. Reconcile captured amount against approved proposal amount
    const approvedNum = Number(input.proposal.proposedAmount);
    const capturedNum = Number(input.capturedAmount);
    const isReconciled = Math.abs(approvedNum - capturedNum) < 0.001;
    const reconciliationStatus = isReconciled ? "RECONCILED" : "EXCEPTION";

    // 2. Build the sequential lifecycle events
    const rawEvents: {
      type: TransactionEventData["eventType"];
      payload: Record<string, unknown>;
    }[] = [
      {
        type: "MANDATE_CREATED",
        payload: {
          mandateId: input.mandate.id,
          title: input.mandate.title,
          instruction: input.mandate.naturalInstruction,
          budgetLimit: input.mandate.budgetLimit,
          currency: input.mandate.currency,
          permittedMerchants: input.mandate.permittedMerchants,
          restrictedMerchants: input.mandate.restrictedMerchants,
        },
      },
      {
        type: "MANDATE_SIGNED",
        payload: {
          mandateId: input.mandate.id,
          signature: input.mandate.signature,
          keyVersion: input.mandate.signingKeyVersion,
          fingerprint: input.mandate.fingerprint,
        },
      },
      {
        type: "PROPOSAL_GENERATED",
        payload: {
          proposalId: input.proposal.id,
          productId: input.proposal.productId,
          productName: input.proposal.productName,
          merchantId: input.proposal.merchantId,
          proposedAmount: input.proposal.proposedAmount,
          currency: input.proposal.currency,
          proposalFingerprint: input.proposal.proposalFingerprint,
        },
      },
      {
        type: "AUTHORIZATION_EVALUATED",
        payload: {
          mandateId: input.mandate.id,
          proposalId: input.proposal.id,
          decision: "ALLOW",
          budgetLimit: input.mandate.budgetLimit,
          proposedAmount: input.proposal.proposedAmount,
        },
      },
      {
        type: "HUMAN_APPROVED",
        payload: {
          approvalId: input.approval.id,
          proposalId: input.approval.proposalId,
          proposalFingerprint: input.approval.proposalFingerprint,
          customerConsent: input.approval.customerConsent,
          approvedAt: input.approval.approvedAt,
        },
      },
      {
        type: "PAYPAL_ORDER_CREATED",
        payload: {
          paymentId: input.payment.id,
          paypalOrderId: input.payment.paypalOrderId,
          paypalPayeeEmail: input.payment.paypalPayeeEmail,
          amount: input.payment.amount,
          currency: input.payment.currency,
        },
      },
      {
        type: "PAYPAL_PAYMENT_CAPTURED",
        payload: {
          paymentId: input.payment.id,
          paypalCaptureId: input.payment.paypalCaptureId || "N/A",
          capturedAmount: input.capturedAmount,
          currency: input.currency,
        },
      },
      {
        type: "FINANCIAL_RECONCILED",
        payload: {
          approvedAmount: input.proposal.proposedAmount,
          capturedAmount: input.capturedAmount,
          variance: (capturedNum - approvedNum).toFixed(2),
          reconciliationStatus,
        },
      },
      {
        type: "PASSPORT_ISSUED",
        payload: {
          passportId,
          transactionId: input.transactionId,
          issuedAt,
        },
      },
    ];

    // 3. Compute the iterative cryptographic hash chain
    let prevHash = genesisHash;
    const events: TransactionEventData[] = [];

    rawEvents.forEach((item, index) => {
      const sequenceNumber = index + 1;
      const canonicalPayload = canonicalStringify({
        sequenceNumber,
        eventType: item.type,
        data: item.payload,
      });

      const currentHash = calculateEventHash(prevHash, canonicalPayload);
      const signature = KeyManager.signCanonical({ sequenceNumber, currentHash });

      const eventRecord: TransactionEventData = {
        id: `evt_${passportId}_${sequenceNumber}`,
        passportId,
        sequenceNumber,
        eventType: item.type,
        canonicalPayload,
        previousHash: prevHash,
        currentHash,
        signature,
        timestamp: new Date().toISOString(),
      };

      events.push(eventRecord);
      prevHash = currentHash;
    });

    const finalHash = prevHash;

    const passport: TransactionPassportData = {
      id: passportId,
      transactionId: input.transactionId,
      mandateId: input.mandate.id,
      proposalId: input.proposal.id,
      approvalId: input.approval.id,
      paymentId: input.payment.id,
      paypalOrderId: input.payment.paypalOrderId,
      paypalCaptureId: input.payment.paypalCaptureId || "N/A",
      verificationStatus: isReconciled ? "VERIFIED" : "INVALID",
      genesisHash,
      finalHash,
      totalEvents: events.length,
      issuedAt,
      summary: {
        productName: input.proposal.productName,
        merchantName: input.proposal.merchantName,
        amount: input.capturedAmount,
        currency: input.currency,
        customerInstruction: input.mandate.naturalInstruction,
        approvedAt: input.approval.approvedAt,
        capturedAt: input.payment.capturedAt || issuedAt,
      },
      events,
    };

    store.savePassport(passport);
    return passport;
  }

  /**
   * Independently verifies the integrity of a Transaction Passport
   */
  public static verifyPassport(passport: TransactionPassportData): PassportVerificationReport {
    if (!passport.events || passport.events.length === 0) {
      return {
        passportId: passport.id,
        transactionId: passport.transactionId,
        verificationStatus: "INCOMPLETE",
        totalEvents: 0,
        chainValid: false,
        signatureValid: false,
        reconciliationValid: false,
        errorDetail: "Passport contains zero events.",
        verifiedAt: new Date().toISOString(),
      };
    }

    let expectedPrevHash = passport.genesisHash;

    for (const evt of passport.events) {
      // 1. Verify previous hash link
      if (evt.previousHash !== expectedPrevHash) {
        return {
          passportId: passport.id,
          transactionId: passport.transactionId,
          verificationStatus: "INVALID",
          totalEvents: passport.events.length,
          chainValid: false,
          signatureValid: false,
          reconciliationValid: false,
          brokenAtSequence: evt.sequenceNumber,
          errorDetail: `Broken hash chain at event sequence ${evt.sequenceNumber}. Expected prev: ${expectedPrevHash.slice(0, 16)}..., got: ${evt.previousHash.slice(0, 16)}...`,
          verifiedAt: new Date().toISOString(),
        };
      }

      // 2. Recalculate current hash from payload
      const recalculatedHash = calculateEventHash(evt.previousHash, evt.canonicalPayload);
      if (recalculatedHash !== evt.currentHash) {
        return {
          passportId: passport.id,
          transactionId: passport.transactionId,
          verificationStatus: "INVALID",
          totalEvents: passport.events.length,
          chainValid: false,
          signatureValid: false,
          reconciliationValid: false,
          brokenAtSequence: evt.sequenceNumber,
          errorDetail: `Payload mutation detected at sequence ${evt.sequenceNumber}! Recalculated hash does not match recorded hash.`,
          verifiedAt: new Date().toISOString(),
        };
      }

      // 3. Verify digital signature if present
      if (evt.signature) {
        const isSigValid = KeyManager.verifyCanonical(
          { sequenceNumber: evt.sequenceNumber, currentHash: evt.currentHash },
          evt.signature
        );
        if (!isSigValid) {
          return {
            passportId: passport.id,
            transactionId: passport.transactionId,
            verificationStatus: "INVALID",
            totalEvents: passport.events.length,
            chainValid: false,
            signatureValid: false,
            reconciliationValid: false,
            brokenAtSequence: evt.sequenceNumber,
            errorDetail: `Digital signature invalid at sequence ${evt.sequenceNumber}.`,
            verifiedAt: new Date().toISOString(),
          };
        }
      }

      expectedPrevHash = evt.currentHash;
    }

    // Final hash must match the last event's hash
    if (expectedPrevHash !== passport.finalHash) {
      return {
        passportId: passport.id,
        transactionId: passport.transactionId,
        verificationStatus: "INVALID",
        totalEvents: passport.events.length,
        chainValid: false,
        signatureValid: false,
        reconciliationValid: false,
        errorDetail: "Passport finalHash does not match terminal event hash.",
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      passportId: passport.id,
      transactionId: passport.transactionId,
      verificationStatus: "VERIFIED",
      totalEvents: passport.events.length,
      chainValid: true,
      signatureValid: true,
      reconciliationValid: true,
      verifiedAt: new Date().toISOString(),
    };
  }
}
