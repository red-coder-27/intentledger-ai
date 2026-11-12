import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/repositories/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await store.ensureInitialized();
  const { id } = await params;
  const passport = store.getPassportById(id) || store.getPassportByTransactionId(id);

  if (!passport) {
    return NextResponse.json(
      { success: false, error: `Transaction passport ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: passport,
  });
}

