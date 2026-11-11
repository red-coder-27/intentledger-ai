import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";

const EvaluateSchema = z.object({
  mandateId: z.string().min(1),
  proposalId: z.string().min(1),
  approvalId: z.string().optional(),
  paymentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluateSchema.parse(body);

    const evaluation = AuthorizationKernel.evaluate(parsed);

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to evaluate policy" },
      { status: 400 }
    );
  }
}
