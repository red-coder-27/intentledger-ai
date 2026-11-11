import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/repositories/store";
import { TransactionPassportService } from "@/server/services/passport/ledger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const passport = store.getPassportById(id) || store.getPassportByTransactionId(id);

  if (!passport) {
    return NextResponse.json(
      { success: false, error: `Transaction passport ${id} not found` },
      { status: 404 }
    );
  }

  const report = TransactionPassportService.verifyPassport(passport);

  return NextResponse.json({
    success: true,
    data: report,
  });
}
