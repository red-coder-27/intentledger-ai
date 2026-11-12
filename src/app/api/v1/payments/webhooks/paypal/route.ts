import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/repositories/store";
import { PayPalClient } from "@/lib/paypal/client";

export async function POST(req: NextRequest) {
  try {
    await store.ensureInitialized();
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const authAlgo = req.headers.get("paypal-auth-algo") || "";
    const certUrl = req.headers.get("paypal-cert-url") || "";
    const transmissionId = req.headers.get("paypal-transmission-id") || "";
    const transmissionSig = req.headers.get("paypal-transmission-sig") || "";
    const transmissionTime = req.headers.get("paypal-transmission-time") || "";

    // 1. Signature Verification
    const isVerified = await PayPalClient.verifyWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookEvent: event,
    });

    if (!isVerified) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // 2. Database-Level Event Deduplication & Idempotency
    const eventId = event.id || transmissionId;
    const { isDuplicate } = await store.recordWebhookIfNew(
      eventId,
      event.event_type || "UNKNOWN",
      transmissionId,
      event
    );

    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        message: `Webhook ${eventId} already processed (database-verified idempotent no-op).`,
      });
    }

    // 3. Process Event Types
    const eventType = event.event_type;
    const resource = event.resource || {};

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const payment = store.getPaymentByOrderId(orderId);
        if (payment && payment.status !== "CAPTURED") {
          await store.updatePaymentStatus(payment.id, "CAPTURED", resource.id, "RECONCILED");
        }
      }
    } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const payment = store.getPaymentByOrderId(orderId);
        if (payment) {
          await store.updatePaymentStatus(payment.id, "DENIED");
        }
      }
    }

    return NextResponse.json({
      success: true,
      eventId,
      eventType,
      status: "PROCESSED",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook" },
      { status: 400 }
    );
  }
}

