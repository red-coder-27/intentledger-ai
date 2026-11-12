-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "paypalPayeeEmail" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isDemoSeller" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attributes" JSONB NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sku" TEXT NOT NULL,
    "deliveryEstimateDays" INTEGER NOT NULL DEFAULT 2,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentMandate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "naturalInstruction" TEXT NOT NULL,
    "budgetLimit" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "permittedMerchants" JSONB NOT NULL,
    "restrictedMerchants" JSONB NOT NULL,
    "requiredAttributes" JSONB NOT NULL,
    "excludedCategories" JSONB NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "requireHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "signature" TEXT NOT NULL,
    "signingKeyVersion" TEXT NOT NULL DEFAULT 'v1',
    "fingerprint" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntentMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseProposal" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "proposedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "proposalFingerprint" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "constraintsSatisfied" JSONB NOT NULL,
    "constraintsViolated" JSONB NOT NULL,
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationDecision" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "evaluatedAmount" DECIMAL(10,2) NOT NULL,
    "maximumAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "proposalFingerprint" TEXT NOT NULL,
    "customerConsent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "paypalOrderId" TEXT NOT NULL,
    "paypalPayeeEmail" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCapture" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paypalCaptureId" TEXT NOT NULL,
    "paypalOrderId" TEXT NOT NULL,
    "capturedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'RECONCILED',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawResponse" JSONB NOT NULL,

    CONSTRAINT "PaymentCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "paypalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "transmissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionPassport" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "genesisHash" TEXT NOT NULL,
    "finalHash" TEXT NOT NULL,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionPassport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL,
    "passportId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "canonicalPayload" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "signature" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordReferenceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paypalOrderId_key" ON "Payment"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCapture_paypalCaptureId_key" ON "PaymentCapture"("paypalCaptureId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_paypalEventId_key" ON "PaymentWebhookEvent"("paypalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionPassport_transactionId_key" ON "TransactionPassport"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionPassport_paymentId_key" ON "TransactionPassport"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionEvent_passportId_sequenceNumber_key" ON "TransactionEvent"("passportId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentMandate" ADD CONSTRAINT "IntentMandate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProposal" ADD CONSTRAINT "PurchaseProposal_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "IntentMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationDecision" ADD CONSTRAINT "AuthorizationDecision_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "IntentMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationDecision" ADD CONSTRAINT "AuthorizationDecision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "PurchaseProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "IntentMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "PurchaseProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "IntentMandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "PurchaseProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCapture" ADD CONSTRAINT "PaymentCapture_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionPassport" ADD CONSTRAINT "TransactionPassport_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvent" ADD CONSTRAINT "TransactionEvent_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "TransactionPassport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
