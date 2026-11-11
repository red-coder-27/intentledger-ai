export type MandateStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "REVOKED" | "COMPLETED";

export interface IntentMandateData {
  id: string;
  userId: string;
  title: string;
  naturalInstruction: string;
  budgetLimit: string; // e.g. "100.00"
  currency: string;    // "USD"
  permittedMerchants: string[];
  restrictedMerchants: string[];
  requiredAttributes: string[];
  excludedCategories: string[];
  maxQuantity: number;
  requireHumanApproval: boolean;
  status: MandateStatus;
  signature: string;
  signingKeyVersion: string;
  fingerprint: string;
  expiresAt: string;   // ISO timestamp
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}

export interface ProductData {
  id: string;
  name: string;
  description: string;
  category: string;
  merchantId: string;
  merchantName: string;
  price: string;       // e.g. "85.00"
  currency: string;
  attributes: string[];
  inStock: boolean;
  sku: string;
  deliveryEstimateDays: number;
  imageUrl: string;
}

export interface MerchantData {
  id: string;
  name: string;
  slug: string;
  paypalPayeeEmail: string;
  isVerified: boolean;
  isDemoSeller: boolean;
}

export interface PurchaseProposalData {
  id: string;
  mandateId: string;
  productId: string;
  productName: string;
  merchantId: string;
  merchantName: string;
  proposedAmount: string;
  currency: string;
  quantity: number;
  proposalFingerprint: string;
  reasoningSummary: string;
  constraintsSatisfied: string[];
  constraintsViolated: string[];
  requiresHumanApproval: boolean;
  status: "PENDING" | "APPROVED" | "BLOCKED" | "EXPIRED";
  createdAt: string;
}

export type AuthorizationDecisionOutcome = "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL";

export type AuthorizationReasonCode =
  | "MANDATE_NOT_FOUND"
  | "MANDATE_INACTIVE"
  | "MANDATE_EXPIRED"
  | "MANDATE_REVOKED"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_OUT_OF_STOCK"
  | "MERCHANT_NOT_ALLOWED"
  | "MERCHANT_RESTRICTED"
  | "PRODUCT_CONSTRAINT_VIOLATION"
  | "EXCLUDED_CATEGORY_VIOLATION"
  | "QUANTITY_EXCEEDED"
  | "CURRENCY_MISMATCH"
  | "BUDGET_EXCEEDED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_NOT_FOUND"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_ALREADY_USED"
  | "PROPOSAL_FINGERPRINT_MISMATCH"
  | "PAYMENT_ALREADY_COMPLETED"
  | "ALL_POLICIES_SATISFIED";

export interface AuthorizationEvaluationResult {
  decision: AuthorizationDecisionOutcome;
  reasonCodes: AuthorizationReasonCode[];
  mandateId: string;
  proposalId: string;
  evaluatedAmount: string;
  maximumAmount: string;
  currency: string;
  evaluatedAt: string;
  checksDetail: {
    checkName: string;
    passed: boolean;
    reasonCode?: AuthorizationReasonCode;
  }[];
}

export interface ApprovalData {
  id: string;
  proposalId: string;
  mandateId: string;
  proposalFingerprint: string;
  customerConsent: boolean;
  status: "PENDING" | "APPROVED" | "USED" | "EXPIRED" | "REVOKED";
  approvedAt: string;
  expiresAt: string;
  usedAt?: string;
}

export type PaymentStatus =
  | "CREATED"
  | "APPROVED"
  | "CAPTURE_PENDING"
  | "CAPTURED"
  | "FAILED"
  | "DENIED"
  | "REFUNDED"
  | "RECONCILIATION_EXCEPTION";

export interface PaymentRecord {
  id: string;
  approvalId: string;
  mandateId: string;
  proposalId: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  paypalPayeeEmail: string;
  merchantName: string;
  productName: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  reconciliationStatus?: "RECONCILED" | "EXCEPTION";
  createdAt: string;
  capturedAt?: string;
}

export interface TransactionPassportData {
  id: string;
  transactionId: string;
  mandateId: string;
  proposalId: string;
  approvalId: string;
  paymentId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  verificationStatus: "VERIFIED" | "INVALID" | "INCOMPLETE";
  genesisHash: string;
  finalHash: string;
  totalEvents: number;
  issuedAt: string;
  summary: {
    productName: string;
    merchantName: string;
    amount: string;
    currency: string;
    customerInstruction: string;
    approvedAt: string;
    capturedAt: string;
  };
  events: TransactionEventData[];
}

export interface TransactionEventData {
  id: string;
  passportId: string;
  sequenceNumber: number;
  eventType:
    | "MANDATE_CREATED"
    | "MANDATE_SIGNED"
    | "PROPOSAL_GENERATED"
    | "AUTHORIZATION_EVALUATED"
    | "HUMAN_APPROVED"
    | "PAYPAL_ORDER_CREATED"
    | "PAYPAL_PAYMENT_CAPTURED"
    | "FINANCIAL_RECONCILED"
    | "PASSPORT_ISSUED";
  canonicalPayload: string;
  previousHash: string;
  currentHash: string;
  signature?: string;
  timestamp: string;
}
